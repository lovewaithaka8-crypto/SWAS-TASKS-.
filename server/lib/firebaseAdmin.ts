import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const INTENDED_FIREBASE_PROJECT_ID = 'swas-tasks-control-centre';

interface FallbackAppletConfig {
  projectId?: string;
  firestoreDatabaseId?: string;
}

function readFallbackAppletConfig(): FallbackAppletConfig {
  try {
    const configPath = path.resolve(__dirname, '../../firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return {};
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as FallbackAppletConfig;
  } catch {
    return {};
  }
}

function parseServiceAccountFromEnv(): Record<string, string> | null {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (parsed && parsed.project_id && parsed.client_email && parsed.private_key) {
      return parsed;
    }
  } catch {
    // Ignore malformed JSON here; health check reports configuration state cleanly
  }
  return null;
}

const fallback = readFallbackAppletConfig();
const envProjectId = (
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  ''
).trim();
const envDatabaseId = (
  process.env.FIREBASE_DATABASE_ID ||
  process.env.VITE_FIREBASE_DATABASE_ID ||
  ''
).trim();

const serviceAccount = parseServiceAccountFromEnv();
const resolvedProjectId =
  envProjectId || serviceAccount?.project_id || fallback.projectId || INTENDED_FIREBASE_PROJECT_ID;
const resolvedDatabaseId = envProjectId
  ? envDatabaseId || '(default)'
  : fallback.firestoreDatabaseId || '(default)';

const adminApp: App = getApps().length
  ? getApp()
  : serviceAccount
    ? initializeApp({
        credential: cert(serviceAccount as never),
        projectId: resolvedProjectId,
      })
    : initializeApp({
        projectId: resolvedProjectId,
      });

const adminAuth: Auth = getAuth(adminApp);
const adminDb: Firestore =
  !resolvedDatabaseId || resolvedDatabaseId === '(default)'
    ? getFirestore(adminApp)
    : getFirestore(adminApp, resolvedDatabaseId);

export { adminApp, adminAuth, adminDb };

export const firebaseProjectInfo = {
  intendedProjectId: INTENDED_FIREBASE_PROJECT_ID,
  activeProjectId: resolvedProjectId,
  activeDatabaseId: resolvedDatabaseId,
  matchesIntendedProject: resolvedProjectId === INTENDED_FIREBASE_PROJECT_ID,
  configuredViaEnv: Boolean(envProjectId || serviceAccount),
  hasExplicitServiceAccountJson: Boolean(serviceAccount),
};

export function isPermissionDeniedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as { code?: unknown; message?: unknown };
  const code = record.code;
  const msg = String(record.message || '').toLowerCase();
  return (
    code === 7 ||
    code === 'permission-denied' ||
    code === 'PERMISSION_DENIED' ||
    msg.includes('permission_denied') ||
    msg.includes('missing or insufficient permissions') ||
    msg.includes('caller does not have permission') ||
    msg.includes('could not load the default credentials') ||
    msg.includes('unable to detect a project id')
  );
}

export interface FirebaseAdminHealthResult {
  intendedProjectId: string;
  activeProjectId: string;
  activeDatabaseId: string;
  matchesIntendedProject: boolean;
  configuredViaEnv: boolean;
  hasExplicitServiceAccountJson: boolean;
  status: 'connected' | 'permission_denied' | 'credentials_missing' | 'error';
  firestoreReadable: boolean;
  detail: string;
  checkedAt: string;
}

export async function checkAdminFirestoreHealth(): Promise<FirebaseAdminHealthResult> {
  const checkedAt = new Date().toISOString();
  try {
    await adminDb.collection('adminSettings').doc('autoApproval').get();
    return {
      ...firebaseProjectInfo,
      status: 'connected',
      firestoreReadable: true,
      detail: `Firebase Admin SDK connected to project "${resolvedProjectId}" (database "${resolvedDatabaseId}").`,
      checkedAt,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();
    const credsMissing =
      lower.includes('default credentials') ||
      lower.includes('could not refresh access token') ||
      lower.includes('metadata');
    const permDenied = isPermissionDeniedError(err) && !credsMissing;

    return {
      ...firebaseProjectInfo,
      status: credsMissing ? 'credentials_missing' : permDenied ? 'permission_denied' : 'error',
      firestoreReadable: false,
      detail: msg,
      checkedAt,
    };
  }
}
