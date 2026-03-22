import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthGate } from "../components/auth/AuthGate";
import { useAuthStore } from "../stores/authStore";
import { useAppStore } from "../stores/appStore";

export function LoginPage() {
  const { theme } = useAppStore();
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [user, loading, navigate]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)" }}>
      <AuthGate onSuccess={() => navigate("/")} />
    </div>
  );
}
