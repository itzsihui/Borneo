"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "firebase/auth";
import {
  appendMerchantStoreSlug,
  authErrorMessage,
  bindMerchantVisaReceive,
  bindMerchantWallet,
  clearMerchantOnboardingDraft,
  isFirebaseConfigured,
  loadMerchantFromCloud,
  merchantReceivingComplete,
  saveMerchantOnboardingDraft,
  signInMerchant,
  signOutMerchant,
  signUpMerchant,
  subscribeMerchantAuth,
  type MerchantOnboardingDraft,
  type MerchantProfile,
  type VisaReceiveAccount,
} from "@/lib/firebase/merchant-auth";

type MerchantAuthContextValue = {
  configured: boolean;
  ready: boolean;
  user: User | null;
  profile: MerchantProfile | null;
  receivingComplete: boolean;
  refreshProfile: () => Promise<void>;
  signUp: (args: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  bindWallet: (address: `0x${string}`) => Promise<void>;
  bindVisa: (visa: VisaReceiveAccount) => Promise<void>;
  recordStoreSlug: (slug: string) => Promise<void>;
  saveOnboardingDraft: (
    payload: Omit<MerchantOnboardingDraft, "updatedAt"> & { updatedAt?: string },
  ) => Promise<void>;
  clearOnboardingDraft: () => Promise<void>;
  errorMessage: (err: unknown) => string;
};

const MerchantAuthContext = createContext<MerchantAuthContextValue | null>(
  null,
);

export function MerchantAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = isFirebaseConfigured();
  const [ready, setReady] = useState(!configured);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MerchantProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const cloud = await loadMerchantFromCloud(user.uid);
    setProfile(cloud);
  }, [user]);

  useEffect(() => {
    if (!configured) {
      setReady(true);
      return;
    }
    const unsub = subscribeMerchantAuth(async (next) => {
      setUser(next);
      if (next) {
        const cloud = await loadMerchantFromCloud(next.uid);
        setProfile(cloud);
      } else {
        setProfile(null);
      }
      setReady(true);
    });
    return () => unsub();
  }, [configured]);

  const value = useMemo<MerchantAuthContextValue>(
    () => ({
      configured,
      ready,
      user,
      profile,
      receivingComplete: merchantReceivingComplete(profile),
      refreshProfile,
      signUp: async (args) => {
        const { profile: created } = await signUpMerchant(args);
        setProfile(created);
      },
      signIn: async (email, password) => {
        const { profile: loaded } = await signInMerchant(email, password);
        setProfile(loaded);
      },
      signOut: async () => {
        await signOutMerchant();
        setProfile(null);
        setUser(null);
      },
      bindWallet: async (address) => {
        if (!user) throw new Error("Sign in as a merchant first");
        const next = await bindMerchantWallet(user.uid, address);
        setProfile(next);
      },
      bindVisa: async (visa) => {
        if (!user) throw new Error("Sign in as a merchant first");
        const next = await bindMerchantVisaReceive(user.uid, visa);
        setProfile(next);
      },
      recordStoreSlug: async (slug) => {
        if (!user) return;
        await appendMerchantStoreSlug(user.uid, slug);
        await refreshProfile();
      },
      saveOnboardingDraft: async (payload) => {
        if (!user) return;
        await saveMerchantOnboardingDraft(user.uid, payload);
        await refreshProfile();
      },
      clearOnboardingDraft: async () => {
        if (!user) return;
        await clearMerchantOnboardingDraft(user.uid);
        await refreshProfile();
      },
      errorMessage: authErrorMessage,
    }),
    [configured, ready, user, profile, refreshProfile],
  );

  return (
    <MerchantAuthContext.Provider value={value}>
      {children}
    </MerchantAuthContext.Provider>
  );
}

export function useMerchantAuth() {
  const ctx = useContext(MerchantAuthContext);
  if (!ctx) {
    throw new Error("useMerchantAuth must be used within MerchantAuthProvider");
  }
  return ctx;
}
