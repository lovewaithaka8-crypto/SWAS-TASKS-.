import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { createUserAccountDocs, pushNotification } from '../lib/marketplaceService';
import type { PublicProfile, UserPrivate, UserRole } from '../types/marketplace';

interface PendingOnboarding {
  role: UserRole;
  displayName?: string;
  businessName?: string;
}

const PENDING_KEY = 'swas_pending_onboarding';

function savePendingOnboarding(data: PendingOnboarding) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

function readPendingOnboarding(): PendingOnboarding | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingOnboarding) : null;
  } catch {
    return null;
  }
}

function clearPendingOnboarding() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'An account already exists with this email address.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters (8+ recommended).',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/user-not-found': 'No account found with that email address.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/popup-closed-by-user': 'Google sign-in popup was closed before finishing.',
    'auth/popup-blocked': 'Browser blocked the sign-in popup. Allow popups for this site.',
    'auth/requires-recent-login': 'Please verify your current password before updating.',
    'auth/operation-not-allowed':
      'Email/Password sign-in is not yet enabled in Firebase Console (Authentication → Sign-in method → Email/Password). Enable it in Firebase Console or use Google Sign-In below.',
  };
  return (code && map[code]) || (err instanceof Error ? err.message : 'Authentication failed.');
}

interface AuthContextValue {
  firebaseUser: User | null;
  userPrivate: UserPrivate | null;
  publicProfile: PublicProfile | null;
  profileLoaded: boolean;
  needsOnboarding: boolean;
  authReady: boolean;
  signingIn: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: (onboarding?: PendingOnboarding) => Promise<boolean>;
  registerWithEmail: (params: {
    email: string;
    password: string;
    displayName: string;
    role: UserRole;
    businessName?: string;
  }) => Promise<boolean>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  changeAccountPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshVerificationState: () => Promise<boolean>;
  completeOnboarding: (onboarding: PendingOnboarding) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userPrivate, setUserPrivate] = useState<UserPrivate | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setUserPrivate(null);
        setPublicProfile(null);
        setProfileLoaded(false);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    setProfileLoaded(false);
    const userPath = `users/${firebaseUser.uid}`;
    const pubPath = `publicProfiles/${firebaseUser.uid}`;

    const unsubPrivate = onSnapshot(
      doc(db, 'users', firebaseUser.uid),
      async (snap) => {
        if (snap.exists()) {
          setUserPrivate(snap.data() as UserPrivate);
          setProfileLoaded(true);
          clearPendingOnboarding();
        } else {
          // If verified and pending onboarding exists (e.g. just verified email or signed up with role), auto-create docs
          const pending = readPendingOnboarding();
          if (firebaseUser.emailVerified && pending) {
            await createUserAccountDocs(
              firebaseUser,
              pending.role,
              pending.displayName,
              pending.businessName
            );
            clearPendingOnboarding();
          } else {
            setUserPrivate(null);
            setProfileLoaded(true);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, userPath);
      }
    );

    const unsubPublic = onSnapshot(
      doc(db, 'publicProfiles', firebaseUser.uid),
      (snap) => {
        setPublicProfile(snap.exists() ? (snap.data() as PublicProfile) : null);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, pubPath);
      }
    );

    return () => {
      unsubPrivate();
      unsubPublic();
    };
  }, [authReady, firebaseUser]);

  const needsOnboarding = Boolean(
    authReady && firebaseUser && firebaseUser.emailVerified && profileLoaded && !userPrivate
  );

  async function signInWithGoogle(onboarding?: PendingOnboarding): Promise<boolean> {
    setSigningIn(true);
    setAuthError(null);
    try {
      if (onboarding) savePendingOnboarding(onboarding);
      const cred = await signInWithPopup(auth, googleProvider);
      if (onboarding && cred.user.emailVerified) {
        await createUserAccountDocs(
          cred.user,
          onboarding.role,
          onboarding.displayName,
          onboarding.businessName
        );
        clearPendingOnboarding();
      }
      return true;
    } catch (err) {
      setAuthError(friendlyAuthError(err));
      return false;
    } finally {
      setSigningIn(false);
    }
  }

  async function registerWithEmail(params: {
    email: string;
    password: string;
    displayName: string;
    role: UserRole;
    businessName?: string;
  }): Promise<boolean> {
    setSigningIn(true);
    setAuthError(null);
    try {
      savePendingOnboarding({
        role: params.role,
        displayName: params.displayName,
        businessName: params.businessName,
      });
      const cred = await createUserWithEmailAndPassword(auth, params.email.trim(), params.password);
      await updateProfile(cred.user, { displayName: params.displayName.trim() });
      await sendEmailVerification(cred.user);
      return true;
    } catch (err) {
      setAuthError(friendlyAuthError(err));
      return false;
    } finally {
      setSigningIn(false);
    }
  }

  async function loginWithEmail(email: string, password: string): Promise<boolean> {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch (err) {
      setAuthError(friendlyAuthError(err));
      return false;
    } finally {
      setSigningIn(false);
    }
  }

  async function resetPassword(email: string): Promise<boolean> {
    setSigningIn(true);
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return true;
    } catch (err) {
      setAuthError(friendlyAuthError(err));
      return false;
    } finally {
      setSigningIn(false);
    }
  }

  async function changeAccountPassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!firebaseUser || !firebaseUser.email) {
      throw new Error('No email-authenticated user found.');
    }
    const isPasswordProvider = firebaseUser.providerData.some(
      (p) => p.providerId === 'password'
    );
    if (!isPasswordProvider) {
      throw new Error(
        'This account uses Google Sign-In. Manage your password directly in your Google Account security settings.'
      );
    }
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    try {
      const cred = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, cred);
      await updatePassword(firebaseUser, newPassword);
      await pushNotification({
        userId: firebaseUser.uid,
        actorId: firebaseUser.uid,
        type: 'security_alert',
        title: 'Password Updated',
        body: 'Your SWAS TASKS account password was updated successfully.',
        linkRoute: 'security',
      });
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  }

  async function resendVerificationEmail(): Promise<void> {
    if (!firebaseUser) return;
    await sendEmailVerification(firebaseUser);
  }

  async function refreshVerificationState(): Promise<boolean> {
    if (!firebaseUser) return false;
    await firebaseUser.reload();
    await firebaseUser.getIdToken(true);
    const refreshed = auth.currentUser;
    if (refreshed) {
      setFirebaseUser({ ...refreshed } as User);
      if (refreshed.emailVerified) {
        const pending = readPendingOnboarding();
        if (pending) {
          await createUserAccountDocs(
            refreshed,
            pending.role,
            pending.displayName,
            pending.businessName
          );
          clearPendingOnboarding();
        }
        return true;
      }
    }
    return false;
  }

  async function completeOnboarding(onboarding: PendingOnboarding): Promise<void> {
    if (!firebaseUser) return;
    await createUserAccountDocs(
      firebaseUser,
      onboarding.role,
      onboarding.displayName,
      onboarding.businessName
    );
    clearPendingOnboarding();
  }

  async function logout(): Promise<void> {
    clearPendingOnboarding();
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userPrivate,
        publicProfile,
        profileLoaded,
        needsOnboarding,
        authReady,
        signingIn,
        authError,
        clearAuthError: () => setAuthError(null),
        signInWithGoogle,
        registerWithEmail,
        loginWithEmail,
        resetPassword,
        changeAccountPassword,
        resendVerificationEmail,
        refreshVerificationState,
        completeOnboarding,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
