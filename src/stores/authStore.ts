import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";

export type UserTier = "free" | "pro" | "enterprise";

export type UserProfile = {
  id: string;
  display_name: string | null;
  tier: UserTier;
};

export type UserCredentialStatus = {
  provider: string;
  is_valid: boolean;
  last_validated_at: string | null;
};

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  credentials: UserCredentialStatus[];
  loading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setCredentials: (credentials: UserCredentialStatus[]) => void;
  setLoading: (loading: boolean) => void;
  isAuthenticated: () => boolean;
  isPro: () => boolean;
  hasCredential: (provider: string) => boolean;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  credentials: [],
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setCredentials: (credentials) => set({ credentials }),
  setLoading: (loading) => set({ loading }),
  isAuthenticated: () => !!get().user,
  isPro: () => {
    const tier = get().profile?.tier;
    return tier === "pro" || tier === "enterprise";
  },
  hasCredential: (provider) =>
    get().credentials.some((c) => c.provider === provider && c.is_valid),
  logout: () => set({ user: null, session: null, profile: null, credentials: [] }),
}));
