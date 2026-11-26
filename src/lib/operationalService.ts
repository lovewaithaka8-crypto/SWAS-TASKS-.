import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { User } from 'firebase/auth';
import { db, storage } from './firebase';
import { normalizeUsername, validateSubmissionFile } from './validation';
import type {
  AccountApplicationRecord,
  AdminAutoApprovalSettings,
  Announcement,
  MarketplaceTask,
  OperationalAuditLog,
  SecurityEvent,
  TaskApprovalTimer,
  TaskCategoryConfig,
  TaskCorrection,
  TaskReservation,
  TaskSourceConfig,
  TaskSourceImport,
  TaskSubmission,
  WalletLedgerEntry,
} from '../types/marketplace';

async function authedJsonFetch<T>(
  user: User,
  url: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  const token = await user.getIdToken();
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    parsed = { error: text || `Request failed (${res.status})` };
  }
  if (!res.ok) {
    throw new Error(String(parsed.error || `Request failed with HTTP ${res.status}`));
  }
  return parsed as T;
}

export async function checkUsernameAvailability(usernameRaw: string): Promise<boolean> {
  const clean = normalizeUsername(usernameRaw);
  if (!/^[a-z0-9_]{3,30}$/.test(clean)) return false;
  try {
    const snap = await getDoc(doc(db, 'usernames', clean));
    return !snap.exists();
  } catch {
    return true;
  }
}

export async function uploadSubmissionAttachment(
  userId: string,
  submissionId: string,
  file: File
): Promise<{
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  downloadUrl: string;
}> {
  const validationErr = validateSubmissionFile(file);
  if (validationErr) throw new Error(validationErr);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  const storagePath = `submissions/${userId}/${submissionId}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(storageRef);

  return {
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    storagePath,
    downloadUrl,
  };
}

// --- API Calls ---

export interface FirebaseAdminHealthResponse {
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

export function fetchFirebaseAdminHealth(user: User) {
  return authedJsonFetch<FirebaseAdminHealthResponse>(user, '/api/admin/firebase/health');
}

export function registerOperationalProfile(
  user: User,
  payload: {
    role: 'worker' | 'client';
    displayName: string;
    username: string;
    phone: string;
    country: string;
    businessName?: string;
    referralCode?: string;
  }
) {
  return authedJsonFetch<{ ok: boolean; accountStatus: string }>(user, '/api/auth/register-profile', {
    method: 'POST',
    body: payload,
  });
}

export function syncVerificationStateBackend(user: User) {
  return authedJsonFetch<{ ok: boolean; accountStatus?: string }>(user, '/api/auth/sync-verification', {
    method: 'POST',
  });
}

export function acceptOperationalTask(user: User, taskId: string) {
  return authedJsonFetch<{ ok: boolean; reservationId: string; submissionId: string }>(
    user,
    `/api/tasks/${encodeURIComponent(taskId)}/accept`,
    { method: 'POST' }
  );
}

export function startOperationalAssignment(user: User, submissionId: string) {
  return authedJsonFetch<{ ok: boolean }>(
    user,
    `/api/assignments/${encodeURIComponent(submissionId)}/start`,
    { method: 'POST' }
  );
}

export function submitOperationalAssignment(
  user: User,
  submissionId: string,
  payload: {
    notes: string;
    deliverableUrl?: string;
    completionDeclared: boolean;
    attachments?: Array<{
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      storagePath: string;
      downloadUrl: string;
    }>;
  }
) {
  return authedJsonFetch<{ ok: boolean; status: string; reviewDeadlineAtMs: number }>(
    user,
    `/api/assignments/${encodeURIComponent(submissionId)}/submit`,
    { method: 'POST', body: payload }
  );
}

export function adminUpdateUserStatus(
  user: User,
  targetUid: string,
  status: string,
  reason: string
) {
  return authedJsonFetch<{ ok: boolean; uid: string; accountStatus: string }>(
    user,
    `/api/admin/users/${encodeURIComponent(targetUid)}/status`,
    { method: 'POST', body: { status, reason } }
  );
}

export function adminSaveCategory(
  user: User,
  payload: {
    id?: string;
    name: string;
    description?: string;
    order?: number;
    enabled?: boolean;
    autoApprovalAllowed?: boolean;
  }
) {
  return authedJsonFetch<{ ok: boolean; id: string }>(user, '/api/admin/categories', {
    method: 'POST',
    body: payload,
  });
}

export function adminDeleteCategory(user: User, categoryId: string) {
  return authedJsonFetch<{ ok: boolean }>(
    user,
    `/api/admin/categories/${encodeURIComponent(categoryId)}`,
    { method: 'DELETE' }
  );
}

export function adminSaveTaskSource(
  user: User,
  payload: {
    id?: string;
    name: string;
    websiteUrl: string;
    sourceType: 'GWENO_HUB' | 'AUTHORIZED_PARTNER';
    importMethod: string;
    enabled: boolean;
    permissionConfirmed: boolean;
    redistributionRightsConfirmed: boolean;
    attributionRequired: boolean;
    attributionTemplate?: string;
    notes?: string;
  }
) {
  return authedJsonFetch<{ ok: boolean; id: string }>(user, '/api/admin/task-sources', {
    method: 'POST',
    body: payload,
  });
}

export function adminImportExternalTask(
  user: User,
  payload: {
    sourceId?: string;
    sourceName: string;
    sourceWebsite: string;
    sourceType: 'GWENO_HUB' | 'AUTHORIZED_PARTNER';
    sourceTaskId: string;
    importMethod: string;
    title: string;
    description: string;
    instructions?: string;
    category: string;
    categoryId?: string;
    sourceRewardOriginal: number;
    sourceCurrency: string;
    swasRewardKes: number;
    maxSlots: number;
    deadline: string;
    permissionConfirmed: boolean;
    redistributionRightsConfirmed: boolean;
    autoApprovalEligible: boolean;
    manualReviewOnly: boolean;
  }
) {
  return authedJsonFetch<{ ok: boolean; taskId: string; importId: string }>(
    user,
    '/api/admin/task-sources/import',
    { method: 'POST', body: payload }
  );
}

export function adminCreateOperationalTask(user: User, payload: Record<string, unknown>) {
  return authedJsonFetch<{ ok: boolean; taskId: string }>(user, '/api/admin/tasks', {
    method: 'POST',
    body: payload,
  });
}

export function adminUpdateOperationalTask(
  user: User,
  taskId: string,
  payload: Record<string, unknown>
) {
  return authedJsonFetch<{ ok: boolean; taskId: string }>(
    user,
    `/api/admin/tasks/${encodeURIComponent(taskId)}`,
    { method: 'PATCH', body: payload }
  );
}

export function adminReviewSubmission(
  user: User,
  submissionId: string,
  payload: {
    action: 'approve' | 'reject' | 'request_correction' | 'hold' | 'release_hold';
    reason?: string;
    internalNote?: string;
  }
) {
  return authedJsonFetch<{ ok: boolean; submissionId: string; action: string }>(
    user,
    `/api/admin/submissions/${encodeURIComponent(submissionId)}/review`,
    { method: 'POST', body: payload }
  );
}

export function adminUpdateAutoApprovalSettings(
  user: User,
  payload: Partial<AdminAutoApprovalSettings>
) {
  return authedJsonFetch<{ ok: boolean; settings: AdminAutoApprovalSettings }>(
    user,
    '/api/admin/settings/auto-approval',
    { method: 'PUT', body: payload }
  );
}

export function adminRunTimersSweep(user: User) {
  return authedJsonFetch<{
    ok: boolean;
    blockedByPermissions: boolean;
    error?: string;
    publishedScheduledTasks: number;
    expiredTasks: number;
    expiredReservations: number;
    timersChecked: number;
    autoApprovedCount: number;
    skippedOrBlockedTimers: number;
  }>(user, '/api/cron/process-timers', { method: 'POST' });
}

export function adminReviewWithdrawal(
  user: User,
  withdrawalId: string,
  payload: {
    action: 'approve_for_payment' | 'mark_processing' | 'mark_paid' | 'reject' | 'hold';
    providerReference?: string;
    txHash?: string;
    reviewNotes?: string;
    rejectionReason?: string;
  }
) {
  return authedJsonFetch<{ ok: boolean; withdrawalId: string; action: string }>(
    user,
    `/api/admin/withdrawals/${encodeURIComponent(withdrawalId)}/review`,
    { method: 'POST', body: payload }
  );
}

export function adminSaveAnnouncement(
  user: User,
  payload: {
    id?: string;
    title: string;
    body: string;
    audience: 'all' | 'workers' | 'clients';
    priority: 'normal' | 'important' | 'critical';
    published: boolean;
  }
) {
  return authedJsonFetch<{ ok: boolean; id: string }>(user, '/api/admin/announcements', {
    method: 'POST',
    body: payload,
  });
}

export async function downloadAdminCsvReport(user: User, type: string): Promise<void> {
  const token = await user.getIdToken();
  const res = await fetch(`/api/admin/reports/export?type=${encodeURIComponent(type)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Failed to export CSV report.');
  }
  const csvBlob = await res.blob();
  const url = URL.createObjectURL(csvBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `swas-${type}-report.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --- Safe Real-Time Firestore Subscriptions ---

export function subscribeTaskCategories(
  onData: (items: TaskCategoryConfig[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'taskCategories'), where('enabled', '==', true)),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TaskCategoryConfig, 'id'>),
      }));
      onData(list.sort((a, b) => (a.order ?? 100) - (b.order ?? 100)));
    },
    () => onData([])
  );
}

export function subscribeAllTaskCategoriesAdmin(
  onData: (items: TaskCategoryConfig[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'taskCategories'),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TaskCategoryConfig, 'id'>),
      }));
      onData(list.sort((a, b) => (a.order ?? 100) - (b.order ?? 100)));
    },
    () => onData([])
  );
}

export function subscribeTaskSubmissionsForUser(
  userId: string,
  onData: (items: TaskSubmission[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'taskSubmissions'), where('userId', '==', userId)),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TaskSubmission, 'id'>),
      }));
      onData(list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)));
    },
    () => onData([])
  );
}

export function subscribeTaskReservationsForUser(
  userId: string,
  onData: (items: TaskReservation[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'taskReservations'), where('userId', '==', userId)),
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TaskReservation, 'id'>),
        }))
      );
    },
    () => onData([])
  );
}

export function subscribeWalletLedgerForUser(
  userId: string,
  onData: (items: WalletLedgerEntry[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'walletLedger'), where('userId', '==', userId)),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WalletLedgerEntry, 'id'>),
      }));
      onData(list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)));
    },
    () => onData([])
  );
}

export function subscribePublishedAnnouncements(
  onData: (items: Announcement[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'announcements'), where('published', '==', true)),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Announcement, 'id'>),
      }));
      onData(list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)));
    },
    () => onData([])
  );
}

export function subscribeAutoApprovalSettings(
  onData: (cfg: AdminAutoApprovalSettings) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'adminSettings', 'autoApproval'),
    (snap) => {
      if (!snap.exists()) {
        onData({
          id: 'autoApproval',
          enabled: true,
          reviewWindowMinutes: 90,
          excludedCategoryIds: [],
          excludedSourceTypes: [],
          maxAutoApproveAmountKes: 50000,
          minAccountAgeDays: 0,
          updatedBy: 'system',
          updatedAtMs: 0,
        });
        return;
      }
      onData({
        id: snap.id,
        ...(snap.data() as Omit<AdminAutoApprovalSettings, 'id'>),
      });
    },
    () => {}
  );
}

// Admin Subscriptions
export function subscribeAllSubmissionsAdmin(
  onData: (items: TaskSubmission[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'taskSubmissions'),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TaskSubmission, 'id'>),
      }));
      onData(list.sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0)));
    },
    () => onData([])
  );
}

export function subscribeAllTimersAdmin(
  onData: (items: TaskApprovalTimer[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'taskApprovalTimers'),
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TaskApprovalTimer, 'id'>),
        }))
      );
    },
    () => onData([])
  );
}

export function subscribeTaskSourcesAdmin(
  onData: (items: TaskSourceConfig[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'taskSources'),
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TaskSourceConfig, 'id'>),
        }))
      );
    },
    () => onData([])
  );
}

export function subscribeTaskSourceImportsAdmin(
  onData: (items: TaskSourceImport[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'taskSourceImports'),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TaskSourceImport, 'id'>),
      }));
      onData(list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)));
    },
    () => onData([])
  );
}

export function subscribeAccountApplicationsAdmin(
  onData: (items: AccountApplicationRecord[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'accountApplications'),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AccountApplicationRecord, 'id'>),
      }));
      onData(list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)));
    },
    () => onData([])
  );
}

export function subscribeAllAuditLogsAdmin(
  onData: (items: OperationalAuditLog[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'auditLogs'),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<OperationalAuditLog, 'id'>),
      }));
      onData(list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)));
    },
    () => onData([])
  );
}

export function subscribeAllSecurityEventsAdmin(
  onData: (items: SecurityEvent[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'securityEvents'),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SecurityEvent, 'id'>),
      }));
      onData(list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)));
    },
    () => onData([])
  );
}

export function subscribeAllWalletLedgerAdmin(
  onData: (items: WalletLedgerEntry[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'walletLedger'),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WalletLedgerEntry, 'id'>),
      }));
      onData(list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)));
    },
    () => onData([])
  );
}

export function subscribeAllCorrectionsAdmin(
  onData: (items: TaskCorrection[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'taskCorrections'),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TaskCorrection, 'id'>),
      }));
      onData(list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)));
    },
    () => onData([])
  );
}

export function subscribeAllTasksAdmin(
  onData: (items: MarketplaceTask[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'tasks'),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MarketplaceTask, 'id'>),
      }));
      onData(list);
    },
    () => onData([])
  );
}

export function subscribeAllAnnouncementsAdmin(
  onData: (items: Announcement[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'announcements'),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Announcement, 'id'>),
      }));
      onData(list.sort((a, b) => (b.updatedAtMs || b.createdAtMs || 0) - (a.updatedAtMs || a.createdAtMs || 0)));
    },
    () => onData([])
  );
}

