import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/auth.ts";
import { BRAND, emailButton, emailLayout } from "../_shared/email.ts";
import { ALL_LEARNING_LESSONS } from "../../../src/lib/academy.ts";
import { shouldSendLearningReminder } from "../../../src/lib/learningReminderSchedule.ts";

type LearningReminderPreferenceRow = {
  user_id: string;
  cadence: "daily" | "weekly";
  weekly_target: number;
  timezone: string;
  email_enabled: boolean;
  preferred_hour: number;
  preferred_weekday: number;
  paused: boolean;
  last_engaged_at: string | null;
  last_reminder_sent_at: string | null;
};

type LearningProgressRow = {
  user_id: string;
  completed_lessons: Record<string, string> | null;
};

const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function isAdminOrWebhook(req: Request): boolean {
  const secret = req.headers.get("x-admin-secret");
  if (ADMIN_SECRET && secret === ADMIN_SECRET) return true;

  const authHeader = req.headers.get("Authorization");
  return authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    SUPABASE_SERVICE_ROLE_KEY,
  );
}

function buildReminderEmail(name: string, lessonTitle: string, cadence: "daily" | "weekly"): { subject: string; html: string; text: string } {
  const title = cadence === "daily" ? "Keep your learning streak alive" : "Finish your learning week strong";
  const subject = cadence === "daily"
    ? `SIBT Learn — keep your streak going`
    : `SIBT Learn — continue this week's lessons`;

  const html = emailLayout(`
    <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">${title}</h1>
    <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">
      ${name ? `${name}, ` : ""}your next lesson is ready: <span style="color: ${BRAND.colors.accent}; font-weight: 600;">${lessonTitle}</span>.
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">
      Open the Learning Academy, keep your streak moving, and continue building process before risk.
    </p>
    ${emailButton(`${BRAND.domain}/learn`, "CONTINUE LEARNING")}
    <p style="font-size: 12px; color: ${BRAND.colors.dim}; margin-top: 24px;">
      You can pause or adjust learning reminders from the Learn tab at any time.
    </p>
  `);

  const text = `${title}

${name ? `${name}, ` : ""}your next lesson is ready: ${lessonTitle}.

Continue learning: ${BRAND.domain}/learn

You can pause or adjust learning reminders from the Learn tab at any time.`;

  return { subject, html, text };
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    if (!isAdminOrWebhook(req)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ skipped: true, reason: "RESEND_API_KEY not configured" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const now = body.now ? new Date(body.now) : new Date();
    const dryRun = Boolean(body.dryRun);
    const fromEmail = Deno.env.get("WELCOME_FROM_EMAIL") || `${BRAND.name} <welcome@sibt.ai>`;
    const supabase = getServiceClient();

    const { data: prefs, error: prefsError } = await supabase
      .from("learning_reminder_preferences")
      .select("user_id, cadence, weekly_target, timezone, email_enabled, preferred_hour, preferred_weekday, paused, last_engaged_at, last_reminder_sent_at")
      .eq("email_enabled", true)
      .eq("paused", false);

    if (prefsError) throw prefsError;

    const results: Array<Record<string, string | boolean>> = [];

    for (const pref of (prefs ?? []) as LearningReminderPreferenceRow[]) {
      const [{ data: sessions }, { data: progress }, { data: authUser }] = await Promise.all([
        supabase
          .from("learning_sessions")
          .select("completed_at")
          .eq("user_id", pref.user_id)
          .order("completed_at", { ascending: false })
          .limit(90),
        supabase
          .from("learning_progress")
          .select("user_id, completed_lessons")
          .eq("user_id", pref.user_id)
          .maybeSingle(),
        supabase.auth.admin.getUserById(pref.user_id),
      ]);

      const sessionDates = (sessions ?? []).map((row) => row.completed_at as string);
      const decision = shouldSendLearningReminder({
        reminders: {
          cadence: pref.cadence,
          weeklyTarget: pref.weekly_target,
          timezone: pref.timezone,
          preferredHour: pref.preferred_hour,
          preferredWeekday: pref.preferred_weekday,
          paused: pref.paused,
        },
        sessions: sessionDates,
        lastReminderSentAt: pref.last_reminder_sent_at,
        now,
      });

      if (!decision.due) {
        results.push({ user_id: pref.user_id, sent: false, status: "not_due" });
        continue;
      }

      const completedLessons = ((progress as LearningProgressRow | null)?.completed_lessons ?? {});
      const nextLesson = ALL_LEARNING_LESSONS.find((lesson) => !completedLessons[lesson.slug]) ?? ALL_LEARNING_LESSONS[0];
      const email = authUser.user?.email;
      if (!email) {
        results.push({ user_id: pref.user_id, sent: false, status: "missing_email" });
        continue;
      }

      const deliveryKey = decision.kind === "daily" ? decision.localDateKey : decision.localWeekKey;
      const existing = await supabase
        .from("learning_reminder_deliveries")
        .select("id")
        .eq("user_id", pref.user_id)
        .eq("reminder_kind", decision.kind)
        .eq("delivery_key", deliveryKey)
        .maybeSingle();

      if (existing.data) {
        results.push({ user_id: pref.user_id, sent: false, status: "already_sent" });
        continue;
      }

      const payload = buildReminderEmail(
        authUser.user?.user_metadata?.display_name || authUser.user?.email?.split("@")[0] || "",
        nextLesson.title,
        decision.kind,
      );

      if (!dryRun) {
        const sendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: email,
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
          }),
        });

        if (!sendRes.ok) {
          const errorText = await sendRes.text();
          await supabase.from("learning_reminder_deliveries").insert({
            user_id: pref.user_id,
            reminder_kind: decision.kind,
            delivery_key: deliveryKey,
            status: "failed",
            metadata: { error: errorText.slice(0, 500) },
          });
          results.push({ user_id: pref.user_id, sent: false, status: "failed" });
          continue;
        }
      }

      await supabase.from("learning_reminder_deliveries").insert({
        user_id: pref.user_id,
        reminder_kind: decision.kind,
        delivery_key: deliveryKey,
        status: "sent",
        metadata: { lesson_slug: nextLesson.slug, dry_run: dryRun },
      });

      await supabase
        .from("learning_reminder_preferences")
        .update({ last_reminder_sent_at: now.toISOString() })
        .eq("user_id", pref.user_id);

      results.push({ user_id: pref.user_id, sent: true, status: dryRun ? "dry_run" : "sent" });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-learning-reminders error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
