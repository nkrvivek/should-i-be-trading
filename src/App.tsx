import { useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AlertsPage } from "./pages/AlertsPage";
import { TermsPage } from "./pages/TermsPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { GlossaryPage } from "./pages/GlossaryPage";
import { PricingPage } from "./pages/PricingPage";
import { LandingPage } from "./pages/LandingPage";
import { RiskDisclosurePage } from "./pages/RiskDisclosurePage";
import { FeaturesPage } from "./pages/FeaturesPage";
import { AuthProvider } from "./components/auth/AuthProvider";
import { UpgradePrompt } from "./components/shared/UpgradePrompt";
import { useAppStore } from "./stores/appStore";
import { useAuthStore } from "./stores/authStore";
import { isSupabaseConfigured } from "./lib/supabase";
import { hasFeature } from "./lib/featureGates";
import type { Feature } from "./lib/featureGates";
import { AlertBell } from "./components/alerts/AlertBell";

// Lazy imports for hub pages
import ResearchPage from "./pages/ResearchPage";
import SignalsPage from "./pages/SignalsPage";
import TradingPage from "./pages/TradingPage";

export default function App() {
  const { theme } = useAppStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public / marketing */}
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/risk" element={<RiskDisclosurePage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/glossary" element={<GlossaryPage />} />

          {/* Core 5 hub pages */}
          <Route path="/" element={<SmartHome />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/signals" element={<SignalsPage />} />
          <Route path="/trading" element={<GatedPage feature="terminal"><TradingPage /></GatedPage>} />

          {/* Gated utility */}
          <Route path="/alerts" element={<GatedPage feature="alerts"><AlertsPage /></GatedPage>} />
          <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />

          {/* ── Redirects from old routes ─────────────────────── */}
          <Route path="/terminal" element={<Navigate to="/trading" replace />} />
          <Route path="/analysis" element={<Navigate to="/research" replace />} />
          <Route path="/insider" element={<Navigate to="/research?tab=insider" replace />} />
          <Route path="/earnings" element={<Navigate to="/research?tab=earnings" replace />} />
          <Route path="/macro" element={<Navigate to="/signals?tab=macro" replace />} />
          <Route path="/regime" element={<Navigate to="/signals?tab=regime" replace />} />
          <Route path="/backtest" element={<Navigate to="/signals?tab=backtest" replace />} />
          <Route path="/strategies" element={<Navigate to="/signals?tab=simulator" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

/** Show landing page for unauthenticated users, dashboard for authenticated */
function SmartHome() {
  const { user, loading } = useAuthStore();
  if (!isSupabaseConfigured()) return <DashboardPage />;
  if (loading) return null;
  if (!user) return <LandingPage />;
  return <DashboardPage />;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (!isSupabaseConfigured()) return <>{children}</>;
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GatedPage({ feature, children }: { feature: Feature; children: React.ReactNode }) {
  const { effectiveTier } = useAuthStore();
  if (!isSupabaseConfigured()) return <>{children}</>;
  if (!hasFeature(effectiveTier(), feature)) {
    return <UpgradePrompt feature={feature} />;
  }
  return <>{children}</>;
}

/** Exported for use in TerminalShell header — now 5 items instead of 12 */
export function AppNav() {
  const { user, profile, effectiveTier, isTrialActive, trialDaysLeft } = useAuthStore();
  const navigate = useNavigate();
  const { toggleTheme, theme } = useAppStore();

  const links: { to: string; label: string; pro?: boolean }[] = [
    { to: "/", label: "DASHBOARD" },
    { to: "/research", label: "RESEARCH" },
    { to: "/signals", label: "SIGNALS" },
    { to: "/trading", label: "TRADING", pro: true },
  ];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "nowrap", overflow: "auto", maxWidth: "100%" }}>
      {links.map(({ to, label, pro }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          style={({ isActive }) => ({
            padding: "5px 12px",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: isActive ? "var(--accent-bg)" : "var(--text-muted)",
            background: isActive ? "rgba(5, 173, 152, 0.1)" : "transparent",
            border: `1px solid ${isActive ? "var(--accent-bg)" : "var(--border-dim)"}`,
            borderRadius: 4,
            textDecoration: "none",
            cursor: "pointer",
            position: "relative" as const,
            whiteSpace: "nowrap" as const,
            flexShrink: 0,
          })}
        >
          {label}
          {pro && !hasFeature(effectiveTier(), "terminal") && (
            <span style={{ fontSize: 8, color: "var(--warning)", marginLeft: 3, verticalAlign: "super" }}>PRO</span>
          )}
        </NavLink>
      ))}

      {/* Trial badge */}
      {isTrialActive() && (
        <span style={{
          padding: "3px 8px",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          color: "var(--signal-core)",
          background: "rgba(5, 173, 152, 0.1)",
          border: "1px solid var(--signal-core)",
          borderRadius: 999,
          letterSpacing: "0.03em",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}>
          TRIAL {trialDaysLeft()}d
        </span>
      )}

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        style={{
          background: "none",
          border: "1px solid var(--border-dim)",
          borderRadius: 4,
          padding: "4px 10px",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-muted)",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {theme === "dark" ? "LIGHT" : "DARK"}
      </button>

      {/* Alert bell */}
      <AlertBell />

      {/* Auth buttons */}
      {user ? (
        <button
          onClick={() => navigate("/settings")}
          title={profile?.display_name ?? "Settings"}
          style={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--accent-bg)",
            border: "none",
            borderRadius: "50%",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" fill="var(--accent-text)" />
            <path d="M4 21c0-4 4-7 8-7s8 3 8 7" fill="var(--accent-text)" />
          </svg>
        </button>
      ) : isSupabaseConfigured() ? (
        <NavLink
          to="/login"
          style={{
            padding: "4px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--signal-core)",
            background: "rgba(5, 173, 152, 0.1)",
            border: "1px solid var(--signal-core)",
            borderRadius: 4,
            textDecoration: "none",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          SIGN IN
        </NavLink>
      ) : null}
    </div>
  );
}
