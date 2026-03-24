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

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete";

export type SubscriptionInfo = {
  plan_tier: UserTier;
  status: SubscriptionStatus;
  billing_interval: "month" | "year" | null;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
};

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  credentials: UserCredentialStatus[];
  subscription: SubscriptionInfo | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setCredentials: (credentials: UserCredentialStatus[]) => void;
  setSubscription: (sub: SubscriptionInfo | null) => void;
  setLoading: (loading: boolean) => void;
  isAuthenticated: () => boolean;
  isPro: () => boolean;
  isTrialing: () => boolean;
  hasActiveSubscription: () => boolean;
  hasCredential: (provider: string) => boolean;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  credentials: [],
  subscription: null,
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setCredentials: (credentials) => set({ credentials }),
  setSubscription: (subscription) => set({ subscription }),
  setLoading: (loading) => set({ loading }),
  isAuthenticated: () => !!get().user,
  isPro: () => {
    const tier = get().profile?.tier;
    return tier === "pro" || tier === "enterprise";
  },
  isTrialing: () => get().subscription?.status === "trialing",
  hasActiveSubscription: () => {
    const sub = get().subscription;
    if (!sub) return false;
    return ["active", "trialing", "past_due"].includes(sub.status);
  },
  hasCredential: (provider) =>
    get().credentials.some((c) => c.provider === provider && c.is_valid),
  logout: () => set({ user: null, session: null, profile: null, credentials: [], subscription: null }),
}));
