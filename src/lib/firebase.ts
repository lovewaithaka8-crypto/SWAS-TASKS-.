import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import fallbackAppletConfig from '../../firebase-applet-config.json';

export const INTENDED_FIREBASE_PROJECT_ID = 'swas-tasks-control-centre';

const envApiKey = (import.meta.env.VITE_FIREBASE_API_KEY || '').trim();
const envAuthDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim();
const envProjectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim();
const envStorageBucket = (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim();
const envMessagingSenderId = (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim();
const envAppId = (import.meta.env.VITE_FIREBASE_APP_ID || '').trim();
const envDatabaseId = (import.meta.env.VITE_FIREBASE_DATABASE_ID || '').trim();

const hasCompleteViteEnvConfig = Boolean(envApiKey && envProjectId && envAppId);

const resolvedConfig = hasCompleteViteEnvConfig
  ? {
      apiKey: envApiKey,
      authDomain: envAuthDomain || `${envProjectId}.firebaseapp.com`,
      projectId: envProjectId,
      storageBucket: envStorageBucket || `${envProjectId}.firebasestorage.app`,
      messagingSenderId: envMessagingSenderId || undefined,
      appId: envAppId,
    }
  : {
      apiKey: fallbackAppletConfig.apiKey,
      authDomain: fallbackAppletConfig.authDomain,
      projectId: fallbackAppletConfig.projectId,
      storageBucket:
        (fallbackAppletConfig as { storageBucket?: string }).storageBucket ||
        `${fallbackAppletConfig.projectId}.firebasestorage.app`,
      messagingSenderId: (fallbackAppletConfig as { messagingSenderId?: string }).messagingSenderId,
      appId: fallbackAppletConfig.appId,
    };

// Critical: when targeting swas-tasks-control-centre (or any explicit VITE_FIREBASE_PROJECT_ID),
// default databaseId to '(default)' unless VITE_FIREBASE_DATABASE_ID is explicitly provided.
const resolvedDatabaseId = hasCompleteViteEnvConfig
  ? envDatabaseId || '(default)'
  : fallbackAppletConfig.firestoreDatabaseId || '(default)';

const app = initializeApp(resolvedConfig);
export const db =
  resolvedDatabaseId === '(default)'
    ? getFirestore(app)
    : getFirestore(app, resolvedDatabaseId);
export const storage = getStorage(app);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

export interface FirebaseConfigDiagnostics {
  intendedProjectId: string;
  activeProjectId: string;
  activeDatabaseId: string;
  matchesIntendedProject: boolean;
  usingViteEnvConfig: boolean;
  missingViteVars: string[];
  storageBucketConfigured: boolean;
}

export function getFirebaseConfigDiagnostics(): FirebaseConfigDiagnostics {
  const missingViteVars: string[] = [];
  if (!envApiKey) missingViteVars.push('VITE_FIREBASE_API_KEY');
  if (!envAuthDomain) missingViteVars.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!envProjectId) missingViteVars.push('VITE_FIREBASE_PROJECT_ID');
  if (!envStorageBucket) missingViteVars.push('VITE_FIREBASE_STORAGE_BUCKET');
  if (!envMessagingSenderId) missingViteVars.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
  if (!envAppId) missingViteVars.push('VITE_FIREBASE_APP_ID');

  return {
    intendedProjectId: INTENDED_FIREBASE_PROJECT_ID,
    activeProjectId: resolvedConfig.projectId,
    activeDatabaseId: resolvedDatabaseId,
    matchesIntendedProject: resolvedConfig.projectId === INTENDED_FIREBASE_PROJECT_ID,
    usingViteEnvConfig: hasCompleteViteEnvConfig,
    missingViteVars,
    storageBucketConfigured: Boolean(resolvedConfig.storageBucket),
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration: client is offline.');
    }
  }
}

void testConnection();
