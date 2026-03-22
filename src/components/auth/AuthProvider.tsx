import { useEffect, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { useAuthStore } from "../../stores/authStore";

type Props = { children: ReactNode };

export function AuthProvider({ children }: Props) {
  const { setUser, setSession, setProfile, setCredentials, setLoading } = useAuthStore();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchCredentials(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchCredentials(session.user.id);
      } else {
        setProfile(null);
        setCredentials([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, tier")
      .eq("id", userId)
      .single();
    if (data) setProfile(data);
  }

  async function fetchCredentials(userId: string) {
    const { data } = await supabase
      .from("user_credentials")
      .select("provider, is_valid, last_validated_at")
      .eq("user_id", userId);
    if (data) setCredentials(data);
  }

  return <>{children}</>;
}
