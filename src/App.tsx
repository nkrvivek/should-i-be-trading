import { useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
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
import { AuthProvider } from "./components/auth/AuthProvider";
import { UpgradePrompt } from "./components/shared/UpgradePrompt";
import { useAppStore } from "./stores/appStore";
import { useAuthStore } from "./stores/authStore";
import { isSupabaseConfigured } from "./lib/supabase";
import { hasFeature } from "./lib/featureGates";

export default function App() {
  const { theme } = useAppStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<WithNav><DashboardPage /></WithNav>} />
          <Route path="/terminal" element={<WithNav><GatedPage feature="terminal"><TerminalPage /></GatedPage></WithNav>} />
          <Route path="/analysis" element={<WithNav><GatedPage feature="ai_analysis"><AnalysisPage /></GatedPage></WithNav>} />
          <Route path="/macro" element={<WithNav><MacroPage /></WithNav>} />
          <Route path="/alerts" element={<WithNav><GatedPage feature="alerts"><AlertsPage /></GatedPage></WithNav>} />
          <Route path="/settings" element={<WithNav><RequireAuth><SettingsPage /></RequireAuth></WithNav>} />
          <Route path="/glossary" element={<WithNav><GlossaryPage /></WithNav>} />
          <Route path="/terms" element={<WithNav><TermsPage /></WithNav>} />
          <Route path="/privacy" element={<WithNav><PrivacyPage /></WithNav>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function WithNav({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (!isSupabaseConfigured()) return <>{children}</>;
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GatedPage({ feature, children }: { feature: "terminal" | "ai_analysis" | "scanner" | "alerts"; children: React.ReactNode }) {
  const { profile } = useAuthStore();

  // If no auth configured (local dev), allow everything
  if (!isSupabaseConfigured()) return <>{children}</>;

  if (!hasFeature(profile?.tier, feature)) {
    return <UpgradePrompt feature={feature} />;
  }

  return <>{children}</>;
}

function NavBar() {
  const { user } = useAuthStore();

  const links = [
    { to: "/", label: "DASHBOARD" },
    { to: "/terminal", label: "TERMINAL" },
    { to: "/macro", label: "MACRO" },
    { to: "/analysis", label: "ANALYSIS" },
    { to: "/glossary", label: "GLOSSARY" },
    ...(user ? [{ to: "/settings", label: "SETTINGS" }] : []),
  ];

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        right: 16,
        zIndex: 100,
        display: "flex",
        gap: 4,
        padding: "8px 0",
        alignItems: "center",
      }}
    >
      {links.map(({ to, label }) => (
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
          })}
        >
          {label}
        </NavLink>
      ))}
      {isSupabaseConfigured() && !user && (
        <NavLink
          to="/login"
          style={{
            padding: "3px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 500,
            color: "var(--signal-core)",
            border: "1px solid var(--signal-core)",
            borderRadius: 4,
            textDecoration: "none",
          }}
        >
          SIGN IN
        </NavLink>
      )}
    </nav>
  );
}
