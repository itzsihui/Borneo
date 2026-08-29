import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { authErrorMessage } from "@/lib/firebase/buyer-auth";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "./client";

const MERCHANTS = "merchants";

export type VisaReceiveAccount = {
  accountLabel: string;
  receiveId?: string;
  settlementNote?: string;
};

export type MerchantProfile = {
  displayName: string;
  email: string;
  walletAddress?: `0x${string}`;
  visaReceive?: VisaReceiveAccount;
  storeSlugs: string[];
  createdAt: string;
};

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function normalizeMerchantProfile(
  data: Partial<MerchantProfile> & { email?: string },
): MerchantProfile | null {
  if (!data?.displayName || !data?.email) return null;
  return {
    displayName: String(data.displayName),
    email: String(data.email).toLowerCase(),
    walletAddress: data.walletAddress
      ? (String(data.walletAddress) as `0x${string}`)
      : undefined,
    visaReceive: data.visaReceive
      ? {
          accountLabel: String(data.visaReceive.accountLabel || "Visa receive"),
          receiveId: data.visaReceive.receiveId
            ? String(data.visaReceive.receiveId)
            : undefined,
          settlementNote: data.visaReceive.settlementNote
            ? String(data.visaReceive.settlementNote)
            : undefined,
        }
      : undefined,
    storeSlugs: Array.isArray(data.storeSlugs)
      ? data.storeSlugs.map(String)
      : [],
    createdAt: String(data.createdAt || new Date().toISOString()),
  };
}

export async function signUpMerchant(args: {
  email: string;
  password: string;
  displayName: string;
}): Promise<{ user: User; profile: MerchantProfile }> {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  if (!auth || !db) throw new Error("Firebase is not configured");

  const cred = await createUserWithEmailAndPassword(
    auth,
    args.email.trim(),
    args.password,
  );
  const name = args.displayName.trim() || "Merchant";
  await updateProfile(cred.user, { displayName: name });

  const profile: MerchantProfile = {
    displayName: name,
    email: args.email.trim().toLowerCase(),
    storeSlugs: [],
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, MERCHANTS, cred.user.uid), {
    ...stripUndefined(profile),
    uid: cred.user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { user: cred.user, profile };
}

export async function signInMerchant(email: string, password: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase is not configured");
  const cred = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
  const profile = await loadMerchantFromCloud(cred.user.uid);
  return { user: cred.user, profile };
}

export async function signOutMerchant() {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await signOut(auth);
}

export async function loadMerchantFromCloud(
  uid: string,
): Promise<MerchantProfile | null> {
  const db = getFirebaseDb();
  if (!db) return null;
  const snap = await getDoc(doc(db, MERCHANTS, uid));
  if (!snap.exists()) return null;
  return normalizeMerchantProfile(snap.data() as Partial<MerchantProfile>);
}

export async function saveMerchantToCloud(
  uid: string,
  profile: MerchantProfile,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  await setDoc(
    doc(db, MERCHANTS, uid),
    {
      ...stripUndefined(profile),
      uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function bindMerchantWallet(
  uid: string,
  walletAddress: `0x${string}`,
): Promise<MerchantProfile | null> {
  const current = await loadMerchantFromCloud(uid);
  if (!current) return null;
  const next: MerchantProfile = { ...current, walletAddress };
  await saveMerchantToCloud(uid, next);
  return next;
}

export async function bindMerchantVisaReceive(
  uid: string,
  visaReceive: VisaReceiveAccount,
): Promise<MerchantProfile | null> {
  const current = await loadMerchantFromCloud(uid);
  if (!current) return null;
  const next: MerchantProfile = {
    ...current,
    visaReceive: {
      accountLabel: visaReceive.accountLabel.trim() || "Visa receive",
      receiveId: visaReceive.receiveId?.trim() || undefined,
      settlementNote: visaReceive.settlementNote?.trim() || undefined,
    },
  };
  await saveMerchantToCloud(uid, next);
  return next;
}

export async function appendMerchantStoreSlug(
  uid: string,
  slug: string,
): Promise<void> {
  const current = await loadMerchantFromCloud(uid);
  if (!current) return;
  if (current.storeSlugs.includes(slug)) return;
  await saveMerchantToCloud(uid, {
    ...current,
    storeSlugs: [...current.storeSlugs, slug],
  });
}

export function merchantReceivingComplete(profile: MerchantProfile | null) {
  return Boolean(profile?.walletAddress && profile?.visaReceive?.accountLabel);
}

export function subscribeMerchantAuth(cb: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  if (!auth || !isFirebaseConfigured()) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export { authErrorMessage, isFirebaseConfigured };
