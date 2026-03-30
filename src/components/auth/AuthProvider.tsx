import { useEffect, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { useAuthStore } from "../../stores/authStore";
import { clearTokenCache } from "../../api/edgeHeaders";
import { setBrokerEncryptionKey } from "../../stores/brokerStore";

type Props = { children: ReactNode };

export function AuthProvider({ children }: Props) {
  const { setUser, setSession, setProfile, setCredentials, setSubscription, setLoading } = useAuthStore();

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, tier, trial_tier, trial_ends_at")
      .eq("id", userId)
      .single();
    if (error) console.warn("Failed to fetch profile:", error.message);
    if (data) setProfile(data);
  }

  async function fetchCredentials(userId: string) {
    const { data, error } = await supabase
      .from("user_credentials")
      .select("provider, is_valid, last_validated_at")
      .eq("user_id", userId);
    if (error) console.warn("Failed to fetch credentials:", error.message);
    if (data) setCredentials(data);
  }

  async function fetchSubscription(userId: string) {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("plan_tier, status, billing_interval, cancel_at_period_end, current_period_end")
      .eq("user_id", userId)
      .single();
    if (error) console.warn("Failed to fetch subscription:", error.message);
    if (data) setSubscription(data);
  }

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setBrokerEncryptionKey(session?.user?.id ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchCredentials(session.user.id);
        fetchSubscription(session.user.id);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setBrokerEncryptionKey(session?.user?.id ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchCredentials(session.user.id);
        fetchSubscription(session.user.id);
      } else {
        clearTokenCache();
        setProfile(null);
        setCredentials([]);
        setSubscription(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
