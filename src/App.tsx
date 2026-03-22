import { useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { TerminalPage } from "./pages/TerminalPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { useAppStore } from "./stores/appStore";

export default function App() {
  const { theme } = useAppStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardWithNav />} />
        <Route path="/terminal" element={<TerminalWithNav />} />
        <Route path="/analysis" element={<AnalysisWithNav />} />
      </Routes>
    </BrowserRouter>
  );
}

function NavBar() {
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
      }}
    >
      {[
        { to: "/", label: "DASHBOARD" },
        { to: "/terminal", label: "TERMINAL" },
        { to: "/analysis", label: "ANALYSIS" },
      ].map(({ to, label }) => (
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
    </nav>
  );
}

function DashboardWithNav() {
  return (
    <>
      <NavBar />
      <DashboardPage />
    </>
  );
}

function TerminalWithNav() {
  return (
    <>
      <NavBar />
      <TerminalPage />
    </>
  );
}

function AnalysisWithNav() {
  return (
    <>
      <NavBar />
      <AnalysisPage />
    </>
  );
}
