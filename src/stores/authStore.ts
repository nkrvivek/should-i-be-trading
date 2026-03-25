import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";

export type UserTier = "free" | "starter" | "pro" | "enterprise";

export type UserProfile = {
  id: string;
  display_name: string | null;
  tier: UserTier;
  trial_tier: UserTier | null;
  trial_ends_at: string | null;
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
  isTrialActive: () => boolean;
  trialDaysLeft: () => number;
  effectiveTier: () => UserTier;
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
    const tier = get().effectiveTier();
    return tier === "pro" || tier === "enterprise";
  },
  isTrialing: () => get().subscription?.status === "trialing",
  isTrialActive: () => {
    const profile = get().profile;
    if (!profile?.trial_ends_at) return false;
    return new Date(profile.trial_ends_at) > new Date();
  },
  trialDaysLeft: () => {
    const profile = get().profile;
    if (!profile?.trial_ends_at) return 0;
    const diff = new Date(profile.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  },
  effectiveTier: () => {
    const { profile, subscription } = get();
    // Paid subscription takes priority (skip free-tier subscriptions)
    if (subscription && subscription.plan_tier !== "free" && ["active", "trialing", "past_due"].includes(subscription.status)) {
      return subscription.plan_tier as UserTier;
    }
    // Check free trial (no card required)
    if (profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date()) {
      return (profile.trial_tier as UserTier) ?? "pro";
    }
    // Fall back to profile tier (free)
    return profile?.tier ?? "free";
  },
  hasActiveSubscription: () => {
    const sub = get().subscription;
    if (!sub) return false;
    return ["active", "trialing", "past_due"].includes(sub.status);
  },
  hasCredential: (provider) =>
    get().credentials.some((c) => c.provider === provider && c.is_valid),
  logout: () => set({ user: null, session: null, profile: null, credentials: [], subscription: null }),
}));
