import { useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { TerminalPage } from "./pages/TerminalPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { MacroPage } from "./pages/MacroPage";
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

export default function App() {
  const { theme } = useAppStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<SmartHome />} />
          <Route path="/terminal" element={<GatedPage feature="terminal"><TerminalPage /></GatedPage>} />
          <Route path="/analysis" element={<GatedPage feature="ai_analysis"><AnalysisPage /></GatedPage>} />
          <Route path="/macro" element={<MacroPage />} />
          <Route path="/alerts" element={<GatedPage feature="alerts"><AlertsPage /></GatedPage>} />
          <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/glossary" element={<GlossaryPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/risk" element={<RiskDisclosurePage />} />
          <Route path="/features" element={<FeaturesPage />} />
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

/** Exported for use in TerminalShell header */
export function AppNav() {
  const { user, profile, effectiveTier, isTrialActive, trialDaysLeft } = useAuthStore();
  const navigate = useNavigate();
  const { toggleTheme, theme } = useAppStore();

  const links = [
    { to: "/", label: "DASHBOARD" },
    { to: "/terminal", label: "TERMINAL", pro: true },
    { to: "/macro", label: "MACRO" },
    { to: "/analysis", label: "ANALYSIS", pro: true },
    { to: "/features", label: "FEATURES" },
    { to: "/glossary", label: "LEARN" },
  ];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {links.map(({ to, label, pro }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => ({
            padding: "3px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.05em",
            color: isActive ? "var(--accent-bg)" : "var(--text-muted)",
            background: isActive ? "rgba(5, 173, 152, 0.1)" : "transparent",
            border: `1px solid ${isActive ? "var(--accent-bg)" : "var(--border-dim)"}`,
            borderRadius: 4,
            textDecoration: "none",
            cursor: "pointer",
            position: "relative" as const,
          })}
        >
          {label}
          {pro && !hasFeature(effectiveTier(), "terminal") && (
            <span style={{ fontSize: 7, color: "var(--warning)", marginLeft: 3, verticalAlign: "super" }}>PRO</span>
          )}
        </NavLink>
      ))}

      {/* Trial badge */}
      {isTrialActive() && (
        <span style={{
          padding: "2px 8px",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 600,
          color: "var(--signal-core)",
          background: "rgba(5, 173, 152, 0.1)",
          border: "1px solid var(--signal-core)",
          borderRadius: 999,
          letterSpacing: "0.03em",
        }}>
          TRIAL: {trialDaysLeft()}d left
        </span>
      )}

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        style={{
          background: "none",
          border: "1px solid var(--border-dim)",
          borderRadius: 4,
          padding: "3px 8px",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: "var(--text-muted)",
          cursor: "pointer",
          marginLeft: 4,
        }}
      >
        {theme === "dark" ? "LIGHT" : "DARK"}
      </button>

      {/* Auth buttons */}
      {user ? (
        <button
          onClick={() => navigate("/settings")}
          style={{
            background: "none",
            border: "1px solid var(--border-dim)",
            borderRadius: 4,
            padding: "3px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          {profile?.display_name?.charAt(0)?.toUpperCase() ?? "U"}
        </button>
      ) : isSupabaseConfigured() ? (
        <NavLink
          to="/login"
          style={{
            padding: "3px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 500,
            color: "var(--signal-core)",
            background: "rgba(5, 173, 152, 0.1)",
            border: "1px solid var(--signal-core)",
            borderRadius: 4,
            textDecoration: "none",
          }}
        >
          SIGN IN
        </NavLink>
      ) : null}
    </div>
  );
}
