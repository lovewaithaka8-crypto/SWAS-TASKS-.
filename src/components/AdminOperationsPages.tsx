import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Download,
  ExternalLink,
  FolderKanban,
  Globe,
  Megaphone,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  Timer,
  Trash2,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getFirebaseConfigDiagnostics } from '../lib/firebase';
import {
  adminCreateOperationalTask,
  adminDeleteCategory,
  adminImportExternalTask,
  adminReviewSubmission,
  adminReviewWithdrawal,
  adminRunTimersSweep,
  adminSaveAnnouncement,
  adminSaveCategory,
  adminSaveTaskSource,
  adminUpdateAutoApprovalSettings,
  adminUpdateOperationalTask,
  adminUpdateUserStatus,
  downloadAdminCsvReport,
  fetchFirebaseAdminHealth,
  type FirebaseAdminHealthResponse,
} from '../lib/operationalService';
import { formatCurrency, formatKes } from '../lib/validation';
import {
  OPERATIONAL_TASK_CATEGORIES,
  type AccountApplicationRecord,
  type AdminAutoApprovalSettings,
  type Announcement,
  type MarketplaceTask,
  type OperationalAuditLog,
  type SecurityEvent,
  type TaskApprovalTimer,
  type TaskCategoryConfig,
  type TaskCorrection,
  type TaskSourceConfig,
  type TaskSourceImport,
  type TaskSourceType,
  type TaskSubmission,
  type UserPrivate,
  type WalletLedgerEntry,
  type WithdrawalRequest,
} from '../types/marketplace';

type AdminOpsTab =
  | 'diagnostics'
  | 'accounts'
  | 'tasks_categories'
  | 'sources_gweno'
  | 'submissions'
  | 'withdrawals_ledger'
  | 'governance_reports';

type SubmissionQueueTab =
  | 'new'
  | 'under_review'
  | 'approaching'
  | 'auto_eligible'
  | 'corrections'
  | 'resubmissions'
  | 'approved'
  | 'rejected'
  | 'on_hold'
  | 'history';

interface AdminOperationsPagesProps {
  registeredUsers: UserPrivate[];
  accountApplications: AccountApplicationRecord[];
  allTasks: MarketplaceTask[];
  taskCategories: TaskCategoryConfig[];
  taskSources: TaskSourceConfig[];
  taskSourceImports: TaskSourceImport[];
  submissions: TaskSubmission[];
  timers: TaskApprovalTimer[];
  corrections: TaskCorrection[];
  autoApprovalSettings: AdminAutoApprovalSettings;
  allWithdrawals: WithdrawalRequest[];
  allWalletLedger: WalletLedgerEntry[];
  announcements: Announcement[];
  auditLogs: OperationalAuditLog[];
  securityEvents: SecurityEvent[];
}

export function AdminOperationsPages({
  registeredUsers,
  accountApplications,
  allTasks,
  taskCategories,
  taskSources,
  taskSourceImports,
  submissions,
  timers,
  corrections,
  autoApprovalSettings,
  allWithdrawals,
  allWalletLedger,
  announcements,
  auditLogs,
  securityEvents,
}: AdminOperationsPagesProps) {
  const { firebaseUser, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminOpsTab>('submissions');
  const [health, setHealth] = useState<FirebaseAdminHealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [sweepBusy, setSweepBusy] = useState(false);
  const [globalNotice, setGlobalNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const clientDiag = useMemo(() => getFirebaseConfigDiagnostics(), []);

  const loadHealth = async () => {
    if (!firebaseUser || !isSuperAdmin) return;
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await fetchFirebaseAdminHealth(firebaseUser);
      setHealth(res);
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Unable to check Admin SDK health.');
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    void loadHealth();
  }, [firebaseUser?.uid, isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div className="swas-card rounded-[14px] p-8 text-center space-y-2">
        <ShieldAlert className="w-8 h-8 text-[#d34552] mx-auto" />
        <h2 className="swas-heading-section">Restricted Access</h2>
        <p className="swas-body text-[#75869d]">
          SWAS TASKS Operations &amp; Review Suite is restricted to verified Super Administrators.
        </p>
      </div>
    );
  }

  const handleRunSweep = async () => {
    if (!firebaseUser) return;
    setSweepBusy(true);
    setGlobalNotice(null);
    try {
      const summary = await adminRunTimersSweep(firebaseUser);
      setGlobalNotice({
        ok: !summary.blockedByPermissions,
        text: summary.blockedByPermissions
          ? summary.error || 'Timer sweep blocked by backend IAM permissions on target project.'
          : `90-minute sweep completed: ${summary.autoApprovedCount} auto-approved, ${summary.timersChecked} timers checked, ${summary.expiredReservations} reservations expired, ${summary.publishedScheduledTasks} scheduled tasks published.`,
      });
    } catch (err) {
      setGlobalNotice({
        ok: false,
        text: err instanceof Error ? err.message : 'Failed to trigger timer sweep.',
      });
    } finally {
      setSweepBusy(false);
    }
  };

  const pendingAccountsCount = useMemo(() => {
    const mergedIds = new Set([
      ...registeredUsers.map((u) => u.uid),
      ...accountApplications.map((a) => a.userId),
    ]);
    let count = 0;
    mergedIds.forEach((uid) => {
      const app = accountApplications.find((a) => a.userId === uid);
      const usr = registeredUsers.find((u) => u.uid === uid);
      const status = usr?.accountStatus || app?.accountStatus;
      if (status === 'PENDING_ADMIN_APPROVAL') count += 1;
    });
    return count;
  }, [registeredUsers, accountApplications]);

  const openSubmissionsCount = submissions.filter((s) =>
    ['UNDER_REVIEW', 'SUBMITTED', 'RESUBMITTED', 'ON_HOLD'].includes(s.status)
  ).length;

  const pendingWithdrawalsCount = allWithdrawals.filter((w) =>
    [
      'PENDING_ADMIN_APPROVAL',
      'APPROVED_FOR_PAYMENT',
      'PROCESSING',
      'ON_HOLD',
      'requested',
      'pending_verification',
    ].includes(w.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="swas-hero rounded-[16px] p-6 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a9c7ee]">
            CENTRAL CONTROL CENTRE · TARGET PROJECT {clientDiag.intendedProjectId}
          </p>
          <h2 className="mt-1 font-display text-[22px] font-bold">
            SWAS TASKS Operations, Review Engine &amp; Compliance
          </h2>
          <p className="mt-1 text-[13px] text-[#dce7f5]">
            Client project active: <strong>{clientDiag.activeProjectId}</strong> · Server Admin SDK:{' '}
            <strong>{health ? `${health.status.toUpperCase()} (${health.activeProjectId})` : 'Checking...'}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={sweepBusy}
            onClick={() => void handleRunSweep()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-white text-[#102b50] text-[13px] font-semibold hover:bg-[#e9f2ff] disabled:opacity-60 whitespace-nowrap cursor-pointer"
          >
            <Timer className={`w-4 h-4 ${sweepBusy ? 'animate-spin' : ''}`} />
            {sweepBusy ? 'Sweeping Timers...' : 'Run 90-Min Timers Sweep'}
          </button>
        </div>
      </div>

      {globalNotice && (
        <div
          className={`p-3.5 rounded-[10px] border text-[13px] flex items-center justify-between gap-3 ${
            globalNotice.ok
              ? 'bg-[#eaf8f2] border-[#bce8d4] text-[#15966b]'
              : 'bg-[#fff0f0] border-[#f1c7c7] text-[#d34552]'
          }`}
        >
          <span>{globalNotice.text}</span>
          <button
            type="button"
            onClick={() => setGlobalNotice(null)}
            className="text-[12px] font-semibold underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 7 Operational Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#dce5f0] pb-3">
        {(
          [
            {
              id: 'submissions',
              label: `Submission Review (${openSubmissionsCount})`,
              icon: ClipboardCheck,
            },
            {
              id: 'accounts',
              label: `Accounts (${pendingAccountsCount} Pending)`,
              icon: UserCheck,
            },
            {
              id: 'tasks_categories',
              label: `Tasks & Categories (${allTasks.length})`,
              icon: FolderKanban,
            },
            {
              id: 'sources_gweno',
              label: `GWENO HUB & Sources (${taskSourceImports.length})`,
              icon: Globe,
            },
            {
              id: 'withdrawals_ledger',
              label: `Withdrawals (${pendingWithdrawalsCount}) & Ledger`,
              icon: Wallet,
            },
            {
              id: 'governance_reports',
              label: `Announcements, Logs & CSV`,
              icon: Megaphone,
            },
            {
              id: 'diagnostics',
              label: `Firebase Diagnostics`,
              icon: Database,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[9px] text-[13px] font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-[#1265c8] text-white'
                  : 'bg-white border border-[#dce5f0] text-[#42556f] hover:bg-[#e9f2ff] hover:text-[#1265c8]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'diagnostics' && (
        <DiagnosticsTab
          clientDiag={clientDiag}
          health={health}
          healthLoading={healthLoading}
          healthError={healthError}
          timersCount={timers.length}
          onRefresh={() => void loadHealth()}
          onRunSweep={() => void handleRunSweep()}
          sweepBusy={sweepBusy}
        />
      )}

      {activeTab === 'accounts' && (
        <AccountsApprovalTab
          registeredUsers={registeredUsers}
          accountApplications={accountApplications}
        />
      )}

      {activeTab === 'tasks_categories' && (
        <TasksAndCategoriesTab allTasks={allTasks} taskCategories={taskCategories} />
      )}

      {activeTab === 'sources_gweno' && (
        <GwenoSourcesTab
          taskSources={taskSources}
          taskSourceImports={taskSourceImports}
          taskCategories={taskCategories}
        />
      )}

      {activeTab === 'submissions' && (
        <SubmissionsReviewTab
          submissions={submissions}
          timers={timers}
          corrections={corrections}
          autoApprovalSettings={autoApprovalSettings}
          taskCategories={taskCategories}
        />
      )}

      {activeTab === 'withdrawals_ledger' && (
        <WithdrawalsAndLedgerTab
          allWithdrawals={allWithdrawals}
          allWalletLedger={allWalletLedger}
        />
      )}

      {activeTab === 'governance_reports' && (
        <GovernanceAndReportsTab
          announcements={announcements}
          auditLogs={auditLogs}
          securityEvents={securityEvents}
        />
      )}
    </div>
  );
}

// --- Tab 1: Firebase Project & IAM Diagnostics ---
function DiagnosticsTab({
  clientDiag,
  health,
  healthLoading,
  healthError,
  timersCount,
  onRefresh,
  onRunSweep,
  sweepBusy,
}: {
  clientDiag: ReturnType<typeof getFirebaseConfigDiagnostics>;
  health: FirebaseAdminHealthResponse | null;
  healthLoading: boolean;
  healthError: string | null;
  timersCount: number;
  onRefresh: () => void;
  onRunSweep: () => void;
  sweepBusy: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="swas-card rounded-[14px] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="swas-heading-section">Firebase Shared Backend Alignment</h3>
            <p className="swas-desc mt-0.5">
              Live inspection of both browser SDK (`VITE_FIREBASE_*`) and server Admin SDK (`FIREBASE_PROJECT_ID`) against target project <strong>{clientDiag.intendedProjectId}</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={healthLoading}
              onClick={onRefresh}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[9px] bg-[#f3f6fa] border border-[#dce5f0] text-[#172b46] text-[13px] font-semibold hover:bg-[#e9f2ff] cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${healthLoading ? 'animate-spin' : ''}`} />
              Refresh Health
            </button>
            <button
              type="button"
              disabled={sweepBusy}
              onClick={onRunSweep}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[9px] swas-btn-primary text-[13px] cursor-pointer"
            >
              <Timer className="w-4 h-4" />
              Trigger 90-Min Sweep ({timersCount} Timers)
            </button>
          </div>
        </div>

        {healthError && (
          <div className="p-3.5 rounded-[9px] bg-[#fff0f0] border border-[#f1c7c7] text-[13px] text-[#d34552]">
            {healthError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-5 rounded-[12px] bg-[#f9fbfe] border border-[#dce5f0] space-y-2.5 text-[13px]">
            <div className="flex items-center justify-between">
              <strong className="text-[#172b46]">Client SDK Configuration</strong>
              <span
                className={`text-[11px] font-bold uppercase ${
                  clientDiag.matchesIntendedProject ? 'text-[#15966b]' : 'text-[#d99527]'
                }`}
              >
                {clientDiag.matchesIntendedProject ? 'TARGET MATCHED' : 'STARTER FALLBACK ACTIVE'}
              </span>
            </div>
            <p>
              <strong>Intended Project:</strong> {clientDiag.intendedProjectId}
            </p>
            <p>
              <strong>Active Client Project:</strong> {clientDiag.activeProjectId}
            </p>
            <p>
              <strong>Active Database ID:</strong> {clientDiag.activeDatabaseId}
            </p>
            <p>
              <strong>Using VITE Env Vars:</strong> {clientDiag.usingViteEnvConfig ? 'Yes' : 'No (fallback)'}
            </p>
            {clientDiag.missingViteVars.length > 0 && (
              <div className="p-3 rounded-[8px] bg-[#fff8ec] border border-[#f5dca8] text-[12px] text-[#7a4f06]">
                <strong>Missing VITE_ Env Variables:</strong> {clientDiag.missingViteVars.join(', ')}
              </div>
            )}
          </div>

          <div className="p-5 rounded-[12px] bg-[#f9fbfe] border border-[#dce5f0] space-y-2.5 text-[13px]">
            <div className="flex items-center justify-between">
              <strong className="text-[#172b46]">Server Firebase Admin SDK</strong>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase ${
                  health?.status === 'connected' ? 'text-[#15966b]' : 'text-[#d34552]'
                }`}
              >
                {health?.status === 'connected' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                {health?.status || 'CHECKING'}
              </span>
            </div>
            <p>
              <strong>Active Server Project:</strong> {health?.activeProjectId || '—'}
            </p>
            <p>
              <strong>Active Server Database:</strong> {health?.activeDatabaseId || '—'}
            </p>
            <p>
              <strong>Firestore Readable:</strong> {health?.firestoreReadable ? 'Yes' : 'No'}
            </p>
            <p>
              <strong>Explicit Service Account JSON:</strong>{' '}
              {health?.hasExplicitServiceAccountJson ? 'Configured' : 'Using Runtime ADC'}
            </p>
            <p className="text-[12px] text-[#42556f] bg-white p-2.5 rounded-[8px] border border-[#e1e8f2]">
              {health?.detail || 'Checking live backend Firestore permissions...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Tab 2: Account Applications & Lifecycle Approvals ---
function AccountsApprovalTab({
  registeredUsers,
  accountApplications,
}: {
  registeredUsers: UserPrivate[];
  accountApplications: AccountApplicationRecord[];
}) {
  const { firebaseUser } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [reasonsByUid, setReasonsByUid] = useState<Record<string, string>>({});
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const mergedAccounts = useMemo(() => {
    const map = new Map<
      string,
      {
        uid: string;
        email: string;
        displayName: string;
        username: string;
        phone: string;
        country: string;
        role: string;
        accountStatus: string;
        statusReason: string;
      }
    >();

    accountApplications.forEach((app) => {
      map.set(app.userId, {
        uid: app.userId,
        email: app.email,
        displayName: app.displayName,
        username: app.username,
        phone: app.phone,
        country: app.country,
        role: app.role,
        accountStatus: app.accountStatus,
        statusReason: app.statusReason || '',
      });
    });

    registeredUsers.forEach((u) => {
      const existing = map.get(u.uid);
      map.set(u.uid, {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        username: u.username || existing?.username || '',
        phone: u.phone || existing?.phone || '',
        country: u.country || existing?.country || 'KE',
        role: u.role,
        accountStatus: u.accountStatus || existing?.accountStatus || 'ACTIVE',
        statusReason: u.statusReason || existing?.statusReason || '',
      });
    });

    const q = search.trim().toLowerCase();
    return Array.from(map.values()).filter((acc) => {
      if (statusFilter !== 'ALL' && acc.accountStatus !== statusFilter) return false;
      if (q) {
        const hay = `${acc.email} ${acc.displayName} ${acc.username} ${acc.phone} ${acc.country}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [registeredUsers, accountApplications, statusFilter, search]);

  const handleStatusUpdate = async (uid: string, nextStatus: string) => {
    if (!firebaseUser) return;
    const reason = (reasonsByUid[uid] || '').trim();
    if (nextStatus !== 'ACTIVE' && reason.length < 3) {
      setNotice({
        ok: false,
        text: `Provide an audit reason before setting account to ${nextStatus}.`,
      });
      return;
    }
    setBusyUid(uid);
    setNotice(null);
    try {
      await adminUpdateUserStatus(
        firebaseUser,
        uid,
        nextStatus,
        reason || 'Verified and activated by Super Administrator.'
      );
      setNotice({
        ok: true,
        text: `Updated user ${uid.slice(0, 10)}... to ${nextStatus}.`,
      });
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to update user status.',
      });
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div className="swas-card rounded-[14px] p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="swas-heading-section">User Accounts &amp; Registration Approval Queue</h3>
          <p className="swas-desc mt-0.5">
            Review applicants, verify profile details, approve accounts to ACTIVE, or restrict/suspend/reject with mandatory audit reasons.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, @username, email..."
            className="px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
          >
            <option value="ALL">All Statuses ({mergedAccounts.length})</option>
            <option value="PENDING_ADMIN_APPROVAL">Pending Admin Approval</option>
            <option value="EMAIL_VERIFICATION_PENDING">Email Verification Pending</option>
            <option value="ACTIVE">Active</option>
            <option value="RESTRICTED">Restricted</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {notice && (
        <div
          className={`p-3.5 rounded-[9px] border text-[13px] ${
            notice.ok
              ? 'bg-[#eaf8f2] border-[#bce8d4] text-[#15966b]'
              : 'bg-[#fff0f0] border-[#f1c7c7] text-[#d34552]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {mergedAccounts.length === 0 ? (
        <p className="swas-body text-[#75869d] py-6 text-center">
          No user accounts or applications match this filter.
        </p>
      ) : (
        <div className="space-y-3">
          {mergedAccounts.map((acc) => (
            <div
              key={acc.uid}
              className="p-4 rounded-[12px] bg-[#f9fbfe] border border-[#dce5f0] space-y-3"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <p className="text-[14px] font-bold text-[#172b46]">
                    {acc.displayName}{' '}
                    {acc.username && (
                      <span className="font-normal text-[#1265c8]">@{acc.username}</span>
                    )}
                  </p>
                  <p className="swas-meta">
                    {acc.email} · {acc.role.toUpperCase()} · {acc.country} ·{' '}
                    {acc.phone || 'No phone'}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-bold uppercase ${
                    acc.accountStatus === 'ACTIVE'
                      ? 'text-[#15966b]'
                      : acc.accountStatus === 'PENDING_ADMIN_APPROVAL'
                      ? 'text-[#d99527]'
                      : 'text-[#d34552]'
                  }`}
                >
                  {acc.accountStatus.replace(/_/g, ' ')}
                </span>
              </div>

              {acc.statusReason && (
                <p className="text-[12px] text-[#42556f]">
                  <strong>Current Note:</strong> {acc.statusReason}
                </p>
              )}

              <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 pt-2 border-t border-[#e1e8f2]">
                <input
                  type="text"
                  maxLength={300}
                  value={reasonsByUid[acc.uid] || ''}
                  onChange={(e) =>
                    setReasonsByUid((prev) => ({ ...prev, [acc.uid]: e.target.value }))
                  }
                  placeholder="Optional approval note or mandatory reject/suspend reason..."
                  className="flex-1 px-3 py-1.5 swas-input bg-white border border-[#d7e2ef] rounded-[8px]"
                />
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={busyUid === acc.uid}
                    onClick={() => void handleStatusUpdate(acc.uid, 'ACTIVE')}
                    className="px-3 py-1.5 rounded-[8px] bg-[#15966b] text-white text-[12px] font-semibold cursor-pointer"
                  >
                    Approve (Active)
                  </button>
                  <button
                    type="button"
                    disabled={busyUid === acc.uid}
                    onClick={() => void handleStatusUpdate(acc.uid, 'RESTRICTED')}
                    className="px-3 py-1.5 rounded-[8px] bg-[#fff8ec] border border-[#f5dca8] text-[#8a5708] text-[12px] font-semibold cursor-pointer"
                  >
                    Restrict
                  </button>
                  <button
                    type="button"
                    disabled={busyUid === acc.uid}
                    onClick={() => void handleStatusUpdate(acc.uid, 'SUSPENDED')}
                    className="px-3 py-1.5 rounded-[8px] bg-[#fff0f0] border border-[#f1c7c7] text-[#d34552] text-[12px] font-semibold cursor-pointer"
                  >
                    Suspend
                  </button>
                  <button
                    type="button"
                    disabled={busyUid === acc.uid}
                    onClick={() => void handleStatusUpdate(acc.uid, 'REJECTED')}
                    className="px-3 py-1.5 rounded-[8px] bg-[#d34552] text-white text-[12px] font-semibold cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Tab 3: Operational Task Creator, Lifecycle & 16-Category CRUD ---
function TasksAndCategoriesTab({
  allTasks,
  taskCategories,
}: {
  allTasks: MarketplaceTask[];
  taskCategories: TaskCategoryConfig[];
}) {
  const { firebaseUser } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(OPERATIONAL_TASK_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [budgetKes, setBudgetKes] = useState('500');
  const [maxSlots, setMaxSlots] = useState('10');
  const [deadline, setDeadline] = useState(() =>
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [lifecycleStatus, setLifecycleStatus] = useState<'PUBLISHED' | 'DRAFT' | 'PAUSED'>(
    'PUBLISHED'
  );
  const [autoApprovalEligible, setAutoApprovalEligible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // Category CRUD state
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catAutoAllowed, setCatAutoAllowed] = useState(true);

  const operationalTasks = useMemo(
    () =>
      allTasks.filter(
        (t) =>
          t.executionMode === 'direct_claim' ||
          t.sourceType === 'SWAS_ORIGINAL' ||
          t.sourceType === 'GWENO_HUB' ||
          t.sourceType === 'AUTHORIZED_PARTNER'
      ),
    [allTasks]
  );

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setBusy(true);
    setNotice(null);
    const matchedCat = taskCategories.find((c) => c.name === category);
    try {
      const res = await adminCreateOperationalTask(firebaseUser, {
        title: title.trim(),
        category,
        categoryId: matchedCat?.id,
        description: description.trim(),
        instructions: (instructions || description).trim(),
        budgetKes: Number(budgetKes),
        maxSlots: Number(maxSlots),
        deadline,
        lifecycleStatus,
        autoApprovalEligible,
        manualReviewOnly: !autoApprovalEligible,
        reviewWindowMinutes: 90,
      });
      setNotice({
        ok: true,
        text: `Created operational task ${res.taskId} (${lifecycleStatus}).`,
      });
      setTitle('');
      setDescription('');
      setInstructions('');
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to create task.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleLifecycleChange = async (
    task: MarketplaceTask,
    nextStatus: 'PUBLISHED' | 'PAUSED' | 'CANCELLED'
  ) => {
    if (!firebaseUser) return;
    setBusy(true);
    setNotice(null);
    try {
      await adminUpdateOperationalTask(firebaseUser, task.id, {
        lifecycleStatus: nextStatus,
        changeNote: `Admin lifecycle update to ${nextStatus}`,
      });
      setNotice({ ok: true, text: `Task "${task.title}" updated to ${nextStatus}.` });
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to update task.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSeedDefaultCategories = async () => {
    if (!firebaseUser) return;
    setBusy(true);
    setNotice(null);
    try {
      for (let i = 0; i < OPERATIONAL_TASK_CATEGORIES.length; i++) {
        await adminSaveCategory(firebaseUser, {
          name: OPERATIONAL_TASK_CATEGORIES[i],
          description: `Standard SWAS operational task category: ${OPERATIONAL_TASK_CATEGORIES[i]}.`,
          order: (i + 1) * 10,
          enabled: true,
          autoApprovalAllowed: true,
        });
      }
      setNotice({ ok: true, text: 'Initialized all 16 canonical SWAS operational task categories.' });
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to initialize categories.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || catName.trim().length < 2) return;
    setBusy(true);
    setNotice(null);
    try {
      await adminSaveCategory(firebaseUser, {
        name: catName.trim(),
        description: catDesc.trim(),
        order: (taskCategories.length + 1) * 10,
        enabled: true,
        autoApprovalAllowed: catAutoAllowed,
      });
      setCatName('');
      setCatDesc('');
      setNotice({ ok: true, text: `Saved category "${catName.trim()}".` });
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : 'Failed to save category.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleToggleCategory = async (cat: TaskCategoryConfig) => {
    if (!firebaseUser) return;
    setBusy(true);
    try {
      await adminSaveCategory(firebaseUser, {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        order: cat.order,
        enabled: !cat.enabled,
        autoApprovalAllowed: cat.autoApprovalAllowed,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCategory = async (cat: TaskCategoryConfig) => {
    if (!firebaseUser) return;
    setBusy(true);
    setNotice(null);
    try {
      await adminDeleteCategory(firebaseUser, cat.id);
      setNotice({ ok: true, text: `Deleted category "${cat.name}".` });
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : 'Cannot delete referenced category.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div
          className={`p-3.5 rounded-[10px] border text-[13px] ${
            notice.ok
              ? 'bg-[#eaf8f2] border-[#bce8d4] text-[#15966b]'
              : 'bg-[#fff0f0] border-[#f1c7c7] text-[#d34552]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Create Operational Task */}
      <form onSubmit={handleCreateTask} className="swas-card rounded-[14px] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="swas-heading-section">Create SWAS Original Operational Task</h3>
            <p className="swas-desc mt-0.5">
              Publish direct-execution slot-based tasks with 90-minute automated review eligibility.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="md:col-span-2">
            <label className="block swas-label mb-1">Task Title</label>
            <input
              type="text"
              required
              minLength={5}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Audit 50 regional business directory records"
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>

          <div>
            <label className="block swas-label mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            >
              {(taskCategories.length > 0
                ? taskCategories.filter((c) => c.enabled).map((c) => c.name)
                : [...OPERATIONAL_TASK_CATEGORIES]
              ).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block swas-label mb-1">Worker Reward (KES)</label>
            <input
              type="number"
              required
              min={50}
              max={5000000}
              value={budgetKes}
              onChange={(e) => setBudgetKes(e.target.value)}
              className="w-full px-3 py-2 swas-input tabular-nums bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>

          <div>
            <label className="block swas-label mb-1">Max Worker Slots</label>
            <input
              type="number"
              required
              min={1}
              max={10000}
              value={maxSlots}
              onChange={(e) => setMaxSlots(e.target.value)}
              className="w-full px-3 py-2 swas-input tabular-nums bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>

          <div>
            <label className="block swas-label mb-1">Deadline &amp; Initial Status</label>
            <div className="flex gap-2">
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="flex-1 px-2.5 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
              <select
                value={lifecycleStatus}
                onChange={(e) =>
                  setLifecycleStatus(e.target.value as 'PUBLISHED' | 'DRAFT' | 'PAUSED')
                }
                className="px-2.5 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              >
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="PAUSED">Paused</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block swas-label mb-1">Public Description</label>
            <textarea
              required
              minLength={15}
              maxLength={4000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary and acceptance requirements visible to workers..."
              className="w-full min-h-[82px] px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block swas-label mb-1">Step-by-Step Instructions (Optional)</label>
            <textarea
              maxLength={4000}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Detailed steps for workers after claiming a slot..."
              className="w-full min-h-[72px] px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label className="flex items-center gap-2 text-[13px] text-[#42556f] cursor-pointer">
            <input
              type="checkbox"
              checked={autoApprovalEligible}
              onChange={(e) => setAutoApprovalEligible(e.target.checked)}
              className="w-4 h-4 accent-[#1265c8]"
            />
            Eligible for 90-minute automatic approval when unreviewed
          </label>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 swas-btn-primary text-[13px] rounded-[9px] disabled:opacity-60 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {busy ? 'Creating...' : 'Create Operational Task'}
          </button>
        </div>
      </form>

      {/* Existing Operational Tasks Lifecycle List */}
      <div className="swas-card rounded-[14px] p-6 space-y-4">
        <h3 className="swas-heading-section">
          Operational Tasks Inventory ({operationalTasks.length})
        </h3>
        {operationalTasks.length === 0 ? (
          <p className="swas-body text-[#75869d]">No operational tasks created or imported yet.</p>
        ) : (
          <div className="space-y-2.5">
            {operationalTasks.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-[11px] bg-[#f9fbfe] border border-[#e1e8f2] flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-[#172b46] truncate">{t.title}</p>
                  <p className="swas-meta">
                    {t.sourceType || 'SWAS_ORIGINAL'} · {t.category} ·{' '}
                    {formatKes(t.budgetKes)} · Slots {t.availableSlots ?? t.maxSlots ?? 1}/
                    {t.maxSlots ?? 1} · Status: {t.lifecycleStatus || t.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleLifecycleChange(t, 'PUBLISHED')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] bg-[#eaf8f2] text-[#15966b] text-[12px] font-semibold cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    Publish
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleLifecycleChange(t, 'PAUSED')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] bg-[#fff8ec] text-[#8a5708] text-[12px] font-semibold cursor-pointer"
                  >
                    <Pause className="w-3 h-3" />
                    Pause
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleLifecycleChange(t, 'CANCELLED')}
                    className="px-2.5 py-1.5 rounded-[7px] bg-[#fff0f0] text-[#d34552] text-[12px] font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configurable Task Categories Manager */}
      <div className="swas-card rounded-[14px] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="swas-heading-section">
              Configurable Task Categories ({taskCategories.length})
            </h3>
            <p className="swas-desc mt-0.5">
              Manage operational categories stored in Firestore `taskCategories`. Referenced categories cannot be deleted unless reassigned.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSeedDefaultCategories()}
            className="px-3.5 py-2 rounded-[9px] bg-[#e9f2ff] text-[#1265c8] text-[12px] font-semibold hover:bg-[#dcebff] cursor-pointer"
          >
            Initialize 16 Canonical Categories
          </button>
        </div>

        <form onSubmit={handleSaveCategory} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block swas-label mb-1">Category Name</label>
            <input
              type="text"
              required
              minLength={2}
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g., Transcription"
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block swas-label mb-1">Description</label>
            <input
              type="text"
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="Scope summary for workers..."
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[12px] text-[#42556f] cursor-pointer">
              <input
                type="checkbox"
                checked={catAutoAllowed}
                onChange={(e) => setCatAutoAllowed(e.target.checked)}
              />
              Auto-Approve
            </label>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-[9px] swas-btn-primary text-[12px] cursor-pointer"
            >
              Add Category
            </button>
          </div>
        </form>

        {taskCategories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
            {taskCategories.map((cat) => (
              <div
                key={cat.id}
                className="p-3 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2] flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#172b46] truncate">{cat.name}</p>
                  <p className="swas-meta">
                    {cat.enabled ? 'Enabled' : 'Disabled'} ·{' '}
                    {cat.autoApprovalAllowed ? 'Auto-Approve OK' : 'Manual Review'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleToggleCategory(cat)}
                    className="px-2 py-1 rounded-[6px] bg-white border border-[#dce5f0] text-[11px] font-semibold text-[#42556f] cursor-pointer"
                  >
                    {cat.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDeleteCategory(cat)}
                    aria-label={`Delete ${cat.name}`}
                    className="p-1.5 rounded-[6px] bg-[#fff0f0] text-[#d34552] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Tab 4: External Sources & Authorized GWENO HUB Imports ---
function GwenoSourcesTab({
  taskSources,
  taskSourceImports,
  taskCategories,
}: {
  taskSources: TaskSourceConfig[];
  taskSourceImports: TaskSourceImport[];
  taskCategories: TaskCategoryConfig[];
}) {
  const { firebaseUser } = useAuth();
  const [sourceName, setSourceName] = useState('GWENO HUB');
  const [sourceWebsite, setSourceWebsite] = useState('https://www.gweno.business/');
  const [sourceType, setSourceType] = useState<'GWENO_HUB' | 'AUTHORIZED_PARTNER'>('GWENO_HUB');
  const [sourceTaskId, setSourceTaskId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [category, setCategory] = useState<string>(OPERATIONAL_TASK_CATEGORIES[9]); // Online Research
  const [sourceRewardOriginal, setSourceRewardOriginal] = useState('5');
  const [sourceCurrency, setSourceCurrency] = useState('USD');
  const [swasRewardKes, setSwasRewardKes] = useState('650');
  const [maxSlots, setMaxSlots] = useState('15');
  const [deadline, setDeadline] = useState(() =>
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [permissionConfirmed, setPermissionConfirmed] = useState(false);
  const [redistributionConfirmed, setRedistributionConfirmed] = useState(false);
  const [autoApprovalEligible, setAutoApprovalEligible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const handleRegisterSource = async () => {
    if (!firebaseUser) return;
    if (!permissionConfirmed || !redistributionConfirmed) {
      setNotice({
        ok: false,
        text: 'Confirm explicit source permission and redistribution rights before registering this source.',
      });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminSaveTaskSource(firebaseUser, {
        id: sourceType === 'GWENO_HUB' ? 'gweno_hub' : undefined,
        name: sourceName.trim(),
        websiteUrl: sourceWebsite.trim(),
        sourceType,
        importMethod: 'permitted_manual_entry',
        enabled: true,
        permissionConfirmed: true,
        redistributionRightsConfirmed: true,
        attributionRequired: true,
      });
      setNotice({ ok: true, text: `Saved authorized task source "${sourceName}" (${res.id}).` });
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to save source.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleImportTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    if (!permissionConfirmed || !redistributionConfirmed) {
      setNotice({
        ok: false,
        text: 'Both authorization and redistribution-rights checkboxes must be confirmed.',
      });
      return;
    }
    setBusy(true);
    setNotice(null);
    const matchedCat = taskCategories.find((c) => c.name === category);
    try {
      const res = await adminImportExternalTask(firebaseUser, {
        sourceId: sourceType === 'GWENO_HUB' ? 'gweno_hub' : undefined,
        sourceName: sourceName.trim(),
        sourceWebsite: sourceWebsite.trim(),
        sourceType,
        sourceTaskId: sourceTaskId.trim(),
        importMethod: 'permitted_manual_entry',
        title: title.trim(),
        description: description.trim(),
        instructions: (instructions || description).trim(),
        category,
        categoryId: matchedCat?.id,
        sourceRewardOriginal: Number(sourceRewardOriginal),
        sourceCurrency: sourceCurrency.trim().toUpperCase(),
        swasRewardKes: Number(swasRewardKes),
        maxSlots: Number(maxSlots),
        deadline,
        permissionConfirmed: true,
        redistributionRightsConfirmed: true,
        autoApprovalEligible,
        manualReviewOnly: !autoApprovalEligible,
      });
      setNotice({
        ok: true,
        text: `Imported authorized task "${title}" (${res.taskId}) with source attribution.`,
      });
      setSourceTaskId('');
      setTitle('');
      setDescription('');
      setInstructions('');
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : 'External task import failed.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div
          className={`p-3.5 rounded-[10px] border text-[13px] ${
            notice.ok
              ? 'bg-[#eaf8f2] border-[#bce8d4] text-[#15966b]'
              : 'bg-[#fff0f0] border-[#f1c7c7] text-[#d34552]'
          }`}
        >
          {notice.text}
        </div>
      )}

      <form onSubmit={handleImportTask} className="swas-card rounded-[14px] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="swas-heading-section">
              Authorized External &amp; GWENO HUB Task Import
            </h3>
            <p className="swas-desc mt-0.5">
              Explicit permission &amp; redistribution confirmation required. Prevents scraping, authentication bypass, or duplicate <code>sourceTaskId</code> imports.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleRegisterSource()}
            className="px-3.5 py-2 rounded-[9px] bg-[#e9f2ff] text-[#1265c8] text-[12px] font-semibold hover:bg-[#dcebff] cursor-pointer"
          >
            Save Source Config ({taskSources.length})
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div>
            <label className="block swas-label mb-1">Source Type</label>
            <select
              value={sourceType}
              onChange={(e) => {
                const val = e.target.value as 'GWENO_HUB' | 'AUTHORIZED_PARTNER';
                setSourceType(val);
                if (val === 'GWENO_HUB') {
                  setSourceName('GWENO HUB');
                  setSourceWebsite('https://www.gweno.business/');
                }
              }}
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            >
              <option value="GWENO_HUB">GWENO HUB (gweno.business)</option>
              <option value="AUTHORIZED_PARTNER">Authorized Partner Feed</option>
            </select>
          </div>

          <div>
            <label className="block swas-label mb-1">Source Name</label>
            <input
              type="text"
              required
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>

          <div>
            <label className="block swas-label mb-1">Source Website URL</label>
            <input
              type="url"
              required
              value={sourceWebsite}
              onChange={(e) => setSourceWebsite(e.target.value)}
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>

          <div>
            <label className="block swas-label mb-1">Unique External Source Task ID</label>
            <input
              type="text"
              required
              value={sourceTaskId}
              onChange={(e) => setSourceTaskId(e.target.value)}
              placeholder="e.g., GWENO-2026-041"
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block swas-label mb-1">Task Title</label>
            <input
              type="text"
              required
              minLength={5}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Authorized GWENO task title..."
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>

          <div>
            <label className="block swas-label mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            >
              {(taskCategories.length > 0
                ? taskCategories.filter((c) => c.enabled).map((c) => c.name)
                : [...OPERATIONAL_TASK_CATEGORIES]
              ).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block swas-label mb-1">Original Source Reward &amp; Currency</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                step="0.01"
                value={sourceRewardOriginal}
                onChange={(e) => setSourceRewardOriginal(e.target.value)}
                className="flex-1 px-3 py-2 swas-input tabular-nums bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
              <input
                type="text"
                maxLength={6}
                value={sourceCurrency}
                onChange={(e) => setSourceCurrency(e.target.value.toUpperCase())}
                className="w-20 px-2.5 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>
          </div>

          <div>
            <label className="block swas-label mb-1">SWAS Payout (KES) &amp; Slots</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={50}
                value={swasRewardKes}
                onChange={(e) => setSwasRewardKes(e.target.value)}
                className="flex-1 px-3 py-2 swas-input tabular-nums bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
              <input
                type="number"
                min={1}
                value={maxSlots}
                onChange={(e) => setMaxSlots(e.target.value)}
                className="w-20 px-2.5 py-2 swas-input tabular-nums bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>
          </div>

          <div>
            <label className="block swas-label mb-1">Deadline</label>
            <input
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block swas-label mb-1">Public Description</label>
            <textarea
              required
              minLength={15}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope and verification details..."
              className="w-full min-h-[76px] px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block swas-label mb-1">Worker Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Optional detailed instructions..."
              className="w-full min-h-[68px] px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>
        </div>

        <div className="space-y-2 p-3.5 rounded-[10px] bg-[#f8fbff] border border-[#dce5f0] text-[12px] text-[#2a3f5d]">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={permissionConfirmed}
              onChange={(e) => setPermissionConfirmed(e.target.checked)}
              className="mt-0.5 accent-[#1265c8]"
            />
            <span>
              I confirm SWAS TASKS holds explicit authorization from {sourceName} to list this task with source attribution.
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={redistributionConfirmed}
              onChange={(e) => setRedistributionConfirmed(e.target.checked)}
              className="mt-0.5 accent-[#1265c8]"
            />
            <span>
              I confirm redistribution and worker reward settlement rights are verified and compliant.
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoApprovalEligible}
              onChange={(e) => setAutoApprovalEligible(e.target.checked)}
              className="mt-0.5 accent-[#1265c8]"
            />
            <span>Allow 90-minute automatic approval when unreviewed</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-2.5 swas-btn-primary text-[13px] rounded-[9px] disabled:opacity-60 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {busy ? 'Importing...' : 'Import Authorized External Task'}
        </button>
      </form>

      {/* Import History */}
      <div className="swas-card rounded-[14px] p-6 space-y-3">
        <h3 className="swas-heading-section">
          External Task Import Audit Trail ({taskSourceImports.length})
        </h3>
        {taskSourceImports.length === 0 ? (
          <p className="swas-body text-[#75869d]">
            No external or GWENO HUB task imports recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse swas-table min-w-[680px]">
              <thead>
                <tr className="border-b border-[#e1e8f2] text-[#75869d]">
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 pr-3 font-semibold">Source</th>
                  <th className="py-2 pr-3 font-semibold">Source Task ID</th>
                  <th className="py-2 pr-3 font-semibold">Title</th>
                  <th className="py-2 pr-3 font-semibold">Source Reward</th>
                  <th className="py-2 font-semibold">SWAS Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1e8f2]">
                {taskSourceImports.map((imp) => (
                  <tr key={imp.id}>
                    <td className="py-2.5 pr-3 text-[#75869d] tabular-nums whitespace-nowrap">
                      {new Date(imp.createdAtMs).toLocaleString('en-KE')}
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-[#172b46]">{imp.sourceName}</td>
                    <td className="py-2.5 pr-3 font-mono text-[12px] text-[#1265c8]">
                      {imp.sourceTaskId}
                    </td>
                    <td className="py-2.5 pr-3 text-[#172b46]">{imp.taskTitle}</td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {imp.sourceCurrency} {imp.sourceRewardOriginal}
                    </td>
                    <td className="py-2.5 font-bold text-[#15966b] tabular-nums">
                      {formatKes(imp.swasRewardKes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Tab 5: 10-Tab Submission Review Centre + Auto-Approval Settings ---
function SubmissionsReviewTab({
  submissions,
  timers,
  corrections,
  autoApprovalSettings,
  taskCategories,
}: {
  submissions: TaskSubmission[];
  timers: TaskApprovalTimer[];
  corrections: TaskCorrection[];
  autoApprovalSettings: AdminAutoApprovalSettings;
  taskCategories: TaskCategoryConfig[];
}) {
  const { firebaseUser } = useAuth();
  const [queueTab, setQueueTab] = useState<SubmissionQueueTab>('new');
  const [selectedSub, setSelectedSub] = useState<TaskSubmission | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [internalNoteInput, setInternalNoteInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Auto-approval settings draft
  const [cfgEnabled, setCfgEnabled] = useState(autoApprovalSettings.enabled);
  const [cfgWindow, setCfgWindow] = useState(String(autoApprovalSettings.reviewWindowMinutes));
  const [cfgMaxKes, setCfgMaxKes] = useState(
    String(autoApprovalSettings.maxAutoApproveAmountKes)
  );
  const [cfgMinDays, setCfgMinDays] = useState(String(autoApprovalSettings.minAccountAgeDays));
  const [cfgExcludedSources, setCfgExcludedSources] = useState<TaskSourceType[]>(
    autoApprovalSettings.excludedSourceTypes || []
  );
  const [cfgExcludedCats, setCfgExcludedCats] = useState<string[]>(
    autoApprovalSettings.excludedCategoryIds || []
  );

  useEffect(() => {
    setCfgEnabled(autoApprovalSettings.enabled);
    setCfgWindow(String(autoApprovalSettings.reviewWindowMinutes));
    setCfgMaxKes(String(autoApprovalSettings.maxAutoApproveAmountKes));
    setCfgMinDays(String(autoApprovalSettings.minAccountAgeDays));
    setCfgExcludedSources(autoApprovalSettings.excludedSourceTypes || []);
    setCfgExcludedCats(autoApprovalSettings.excludedCategoryIds || []);
  }, [autoApprovalSettings]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const armedTimersBySub = useMemo(() => {
    const map = new Map<string, TaskApprovalTimer>();
    timers.forEach((t) => {
      if (t.status === 'ARMED' || t.status === 'PAUSED_ON_HOLD') {
        map.set(t.submissionId, t);
      }
    });
    return map;
  }, [timers]);

  const filteredSubs = useMemo(() => {
    switch (queueTab) {
      case 'new':
        return submissions.filter((s) => s.status === 'SUBMITTED' || s.status === 'UNDER_REVIEW');
      case 'under_review':
        return submissions.filter((s) => s.status === 'UNDER_REVIEW' || s.status === 'RESUBMITTED');
      case 'approaching':
        return submissions.filter(
          (s) =>
            (s.status === 'UNDER_REVIEW' || s.status === 'RESUBMITTED') &&
            !s.onHold &&
            s.reviewDeadlineAtMs &&
            s.reviewDeadlineAtMs - nowMs <= 20 * 60 * 1000
        );
      case 'auto_eligible':
        return submissions.filter(
          (s) =>
            (s.status === 'UNDER_REVIEW' || s.status === 'RESUBMITTED') &&
            s.autoApprovalEligible &&
            !s.manualReviewOnly &&
            !s.onHold
        );
      case 'corrections':
        return submissions.filter((s) => s.status === 'CORRECTION_REQUESTED');
      case 'resubmissions':
        return submissions.filter((s) => s.version > 1 || Boolean(s.resubmittedAtMs));
      case 'approved':
        return submissions.filter(
          (s) => s.status === 'APPROVED' || s.status === 'AUTO_APPROVED'
        );
      case 'rejected':
        return submissions.filter((s) => s.status === 'REJECTED');
      case 'on_hold':
        return submissions.filter((s) => s.onHold || s.status === 'ON_HOLD');
      case 'history':
      default:
        return submissions;
    }
  }, [submissions, queueTab, nowMs]);

  const handleReviewAction = async (
    action: 'approve' | 'reject' | 'request_correction' | 'hold' | 'release_hold'
  ) => {
    if (!firebaseUser || !selectedSub) return;
    if (
      (action === 'reject' || action === 'request_correction' || action === 'hold') &&
      reasonInput.trim().length < 3
    ) {
      setNotice({
        ok: false,
        text: `Provide a clear worker-facing reason before running ${action.replace(/_/g, ' ')}.`,
      });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await adminReviewSubmission(firebaseUser, selectedSub.id, {
        action,
        reason: reasonInput.trim() || undefined,
        internalNote: internalNoteInput.trim() || undefined,
      });
      setNotice({
        ok: true,
        text: `Submission ${selectedSub.id} updated via "${action.replace(/_/g, ' ')}".`,
      });
      setSelectedSub(null);
      setReasonInput('');
      setInternalNoteInput('');
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to review submission.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setBusy(true);
    setNotice(null);
    try {
      await adminUpdateAutoApprovalSettings(firebaseUser, {
        enabled: cfgEnabled,
        reviewWindowMinutes: Number(cfgWindow || 90),
        maxAutoApproveAmountKes: Number(cfgMaxKes || 50000),
        minAccountAgeDays: Number(cfgMinDays || 0),
        excludedSourceTypes: cfgExcludedSources,
        excludedCategoryIds: cfgExcludedCats,
      });
      setNotice({ ok: true, text: '90-minute auto-approval settings saved.' });
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : 'Failed to save auto-approval settings.',
      });
    } finally {
      setBusy(false);
    }
  };

  const queueTabs: Array<{ id: SubmissionQueueTab; label: string }> = [
    { id: 'new', label: 'New Submissions' },
    { id: 'under_review', label: 'Under Review' },
    { id: 'approaching', label: 'Approaching 90-Min Deadline' },
    { id: 'auto_eligible', label: 'Auto-Approval Eligible' },
    { id: 'corrections', label: `Correction Requests (${corrections.length})` },
    { id: 'resubmissions', label: 'Resubmissions' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'on_hold', label: 'Suspicious / On Hold' },
    { id: 'history', label: `Review History (${submissions.length})` },
  ];

  return (
    <div className="space-y-6">
      {notice && (
        <div
          className={`p-3.5 rounded-[10px] border text-[13px] ${
            notice.ok
              ? 'bg-[#eaf8f2] border-[#bce8d4] text-[#15966b]'
              : 'bg-[#fff0f0] border-[#f1c7c7] text-[#d34552]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* 10 Queue Sub-Tabs */}
      <div className="swas-card rounded-[14px] p-5 space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {queueTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setQueueTab(t.id)}
              className={`px-3 py-1.5 rounded-[8px] text-[12px] font-semibold whitespace-nowrap cursor-pointer ${
                queueTab === t.id
                  ? 'bg-[#102b50] text-white'
                  : 'bg-[#f3f6fa] text-[#42556f] hover:bg-[#e9f2ff]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 border-t border-[#e1e8f2]">
          <div className="lg:col-span-7 space-y-2.5">
            {filteredSubs.length === 0 ? (
              <p className="swas-body text-[#75869d] py-8 text-center">
                No submissions in this queue tab right now.
              </p>
            ) : (
              filteredSubs.map((sub) => {
                const timer = armedTimersBySub.get(sub.id);
                const deadline = sub.reviewDeadlineAtMs || timer?.dueAtMs;
                const minsLeft = deadline
                  ? Math.max(0, Math.ceil((deadline - nowMs) / 60000))
                  : null;
                const active = selectedSub?.id === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setSelectedSub(sub);
                      setInternalNoteInput(sub.internalNotes || '');
                    }}
                    className={`w-full text-left p-4 rounded-[11px] border transition cursor-pointer ${
                      active
                        ? 'bg-[#e9f2ff] border-[#1265c8]'
                        : 'bg-[#f9fbfe] border-[#dce5f0] hover:border-[#b7cff0]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-[#5b6d85]">
                          {sub.sourceType} · {sub.category} · v{sub.version}
                        </p>
                        <p className="text-[14px] font-bold text-[#172b46] truncate">
                          {sub.taskTitle}
                        </p>
                        <p className="swas-meta">
                          Worker: {sub.userName} ({sub.userEmail})
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="block text-[14px] font-bold text-[#172b46] tabular-nums">
                          {formatKes(sub.rewardKes)}
                        </span>
                        <span className="text-[11px] font-bold text-[#1265c8] uppercase">
                          {sub.onHold ? 'ON HOLD' : sub.status.replace(/_/g, ' ')}
                        </span>
                        {minsLeft !== null &&
                          (sub.status === 'UNDER_REVIEW' || sub.status === 'RESUBMITTED') && (
                            <span className="block text-[11px] text-[#d99527] tabular-nums">
                              {sub.onHold ? 'Timer paused' : `${minsLeft}m left`}
                            </span>
                          )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="lg:col-span-5 p-5 rounded-[12px] bg-[#f9fbfe] border border-[#dce5f0] space-y-4">
            <h4 className="swas-heading-card text-[#172b46]">Submission Inspection &amp; Decision</h4>
            {!selectedSub ? (
              <p className="swas-body text-[#75869d]">
                Select any submission on the left to inspect deliverables, uploaded files, and issue an approval, correction request, hold, or rejection.
              </p>
            ) : (
              <div className="space-y-3 text-[13px]">
                <div className="p-3 rounded-[9px] bg-white border border-[#e1e8f2] space-y-1">
                  <p>
                    <strong>Task:</strong> {selectedSub.taskTitle}
                  </p>
                  <p>
                    <strong>Worker:</strong> {selectedSub.userName} ({selectedSub.userEmail})
                  </p>
                  <p>
                    <strong>Source &amp; Reward:</strong> {selectedSub.sourceName} ·{' '}
                    {formatKes(selectedSub.rewardKes)}
                  </p>
                  <p>
                    <strong>Notes:</strong> {selectedSub.notes || 'No summary notes submitted yet.'}
                  </p>
                  {selectedSub.deliverableUrl && (
                    <a
                      href={selectedSub.deliverableUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#1265c8] font-semibold hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Deliverable URL
                    </a>
                  )}
                  {selectedSub.attachments && selectedSub.attachments.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-2">
                      {selectedSub.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[12px] text-[#1265c8] underline"
                        >
                          {att.fileName}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block swas-label mb-1">
                    Decision / Correction / Hold Reason
                  </label>
                  <textarea
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    placeholder="Required for Reject, Request Correction, or Hold..."
                    className="w-full min-h-[72px] px-3 py-2 swas-input bg-white border border-[#d7e2ef] rounded-[8px]"
                  />
                </div>

                <div>
                  <label className="block swas-label mb-1">Admin Internal Audit Note</label>
                  <input
                    type="text"
                    value={internalNoteInput}
                    onChange={(e) => setInternalNoteInput(e.target.value)}
                    placeholder="Internal review note..."
                    className="w-full px-3 py-2 swas-input bg-white border border-[#d7e2ef] rounded-[8px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleReviewAction('approve')}
                    className="py-2 px-3 rounded-[8px] bg-[#15966b] text-white text-[12px] font-semibold cursor-pointer"
                  >
                    Approve &amp; Credit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleReviewAction('request_correction')}
                    className="py-2 px-3 rounded-[8px] bg-[#fff8ec] border border-[#f5dca8] text-[#8a5708] text-[12px] font-semibold cursor-pointer"
                  >
                    Request Correction
                  </button>
                  {selectedSub.onHold ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleReviewAction('release_hold')}
                      className="py-2 px-3 rounded-[8px] bg-[#e9f2ff] text-[#1265c8] text-[12px] font-semibold cursor-pointer"
                    >
                      Release Hold (+90m)
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleReviewAction('hold')}
                      className="py-2 px-3 rounded-[8px] bg-[#f3f6fa] border border-[#d7e2ef] text-[#42556f] text-[12px] font-semibold cursor-pointer"
                    >
                      Place on Hold
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleReviewAction('reject')}
                    className="py-2 px-3 rounded-[8px] bg-[#d34552] text-white text-[12px] font-semibold cursor-pointer"
                  >
                    Reject Submission
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Auto-Approval Engine Configuration */}
      <form onSubmit={handleSaveSettings} className="swas-card rounded-[14px] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="swas-heading-section">90-Minute Auto-Approval Engine Rules</h3>
            <p className="swas-desc mt-0.5">
              Configure automatic approval thresholds enforced by <code>server/cron/reviewEngine.ts</code> and <code>/api/cron/process-timers</code>.
            </p>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 swas-btn-primary text-[13px] rounded-[9px] cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Auto-Approval Rules
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 items-end">
          <label className="flex items-center gap-2 p-2.5 rounded-[9px] bg-[#f9fbfe] border border-[#dce5f0] text-[13px] cursor-pointer">
            <input
              type="checkbox"
              checked={cfgEnabled}
              onChange={(e) => setCfgEnabled(e.target.checked)}
              className="accent-[#1265c8]"
            />
            <span>Auto-Approval Engine Enabled</span>
          </label>
          <div>
            <label className="block swas-label mb-1">Review Window (Minutes)</label>
            <input
              type="number"
              min={5}
              max={1440}
              value={cfgWindow}
              onChange={(e) => setCfgWindow(e.target.value)}
              className="w-full px-3 py-2 swas-input tabular-nums bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>
          <div>
            <label className="block swas-label mb-1">Max Auto-Approve Reward (KES)</label>
            <input
              type="number"
              min={50}
              value={cfgMaxKes}
              onChange={(e) => setCfgMaxKes(e.target.value)}
              className="w-full px-3 py-2 swas-input tabular-nums bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>
          <div>
            <label className="block swas-label mb-1">Min Account Age (Days)</label>
            <input
              type="number"
              min={0}
              value={cfgMinDays}
              onChange={(e) => setCfgMinDays(e.target.value)}
              className="w-full px-3 py-2 swas-input tabular-nums bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-[12px]">
          <div>
            <p className="font-semibold text-[#172b46] mb-1.5">Excluded Task Sources</p>
            <div className="flex flex-wrap gap-3">
              {(['SWAS_ORIGINAL', 'GWENO_HUB', 'AUTHORIZED_PARTNER'] as TaskSourceType[]).map(
                (src) => (
                  <label key={src} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cfgExcludedSources.includes(src)}
                      onChange={(e) =>
                        setCfgExcludedSources((prev) =>
                          e.target.checked ? [...prev, src] : prev.filter((x) => x !== src)
                        )
                      }
                    />
                    {src}
                  </label>
                )
              )}
            </div>
          </div>

          {taskCategories.length > 0 && (
            <div>
              <p className="font-semibold text-[#172b46] mb-1.5">Excluded Categories</p>
              <div className="flex flex-wrap gap-3">
                {taskCategories.map((c) => (
                  <label key={c.id} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cfgExcludedCats.includes(c.id)}
                      onChange={(e) =>
                        setCfgExcludedCats((prev) =>
                          e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)
                        )
                      }
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

// --- Tab 6: Atomic Withdrawals (Pending Approval / Release) & Wallet Ledger ---
function WithdrawalsAndLedgerTab({
  allWithdrawals,
  allWalletLedger,
}: {
  allWithdrawals: WithdrawalRequest[];
  allWalletLedger: WalletLedgerEntry[];
}) {
  const { firebaseUser } = useAuth();
  const [selectedWd, setSelectedWd] = useState<WithdrawalRequest | null>(null);
  const [providerRef, setProviderRef] = useState('');
  const [txHash, setTxHash] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const handleAction = async (
    action: 'approve_for_payment' | 'mark_processing' | 'mark_paid' | 'reject' | 'hold'
  ) => {
    if (!firebaseUser || !selectedWd) return;
    setBusy(true);
    setNotice(null);
    try {
      await adminReviewWithdrawal(firebaseUser, selectedWd.id, {
        action,
        providerReference: providerRef.trim() || undefined,
        txHash: txHash.trim() || undefined,
        reviewNotes: reasonNote.trim() || undefined,
        rejectionReason: action === 'reject' ? reasonNote.trim() : undefined,
      });
      setNotice({
        ok: true,
        text: `Withdrawal ${selectedWd.reference || selectedWd.id} processed (${action.replace(
          /_/g,
          ' '
        )}).`,
      });
      setSelectedWd(null);
      setProviderRef('');
      setTxHash('');
      setReasonNote('');
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to process withdrawal action.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div
          className={`p-3.5 rounded-[10px] border text-[13px] ${
            notice.ok
              ? 'bg-[#eaf8f2] border-[#bce8d4] text-[#15966b]'
              : 'bg-[#fff0f0] border-[#f1c7c7] text-[#d34552]'
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 swas-card rounded-[14px] p-6 space-y-3">
          <h3 className="swas-heading-section">
            Backend-Atomic Withdrawals Queue ({allWithdrawals.length})
          </h3>
          {allWithdrawals.length === 0 ? (
            <p className="swas-body text-[#75869d]">No withdrawal requests logged yet.</p>
          ) : (
            <div className="space-y-2.5">
              {allWithdrawals.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setSelectedWd(w);
                    setProviderRef(w.providerReference || '');
                    setTxHash(w.txHash || '');
                    setReasonNote(w.reviewNotes || '');
                  }}
                  className={`w-full text-left p-3.5 rounded-[10px] border cursor-pointer ${
                    selectedWd?.id === w.id
                      ? 'bg-[#e9f2ff] border-[#1265c8]'
                      : 'bg-[#f9fbfe] border-[#dce5f0]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-bold text-[#172b46]">
                        {w.institutionName || w.method} · {w.maskedDestination || w.destination}
                      </p>
                      <p className="swas-meta">
                        User: {w.userId.slice(0, 12)} · Ref: {w.reference || w.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="block text-[14px] font-bold text-[#172b46] tabular-nums">
                        {formatCurrency(w.amountKes, w.currency || 'KES')}
                      </span>
                      <span className="text-[11px] font-bold text-[#1265c8] uppercase">
                        {w.status}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 swas-card rounded-[14px] p-6 space-y-3.5">
          <h3 className="swas-heading-section">Reserved Funds &amp; Payout Settlement</h3>
          {!selectedWd ? (
            <p className="swas-body text-[#75869d]">
              Select a withdrawal request to approve for payment, mark paid with a real provider receipt/hash, or reject (automatically releasing reserved funds back to available balance).
            </p>
          ) : (
            <div className="space-y-3 text-[13px]">
              <div className="p-3 rounded-[9px] bg-[#f8fbff] border border-[#dce5f0] space-y-1">
                <p>
                  <strong>Ref:</strong> {selectedWd.reference || selectedWd.id}
                </p>
                <p>
                  <strong>Amount:</strong>{' '}
                  {formatCurrency(selectedWd.amountKes, selectedWd.currency || 'KES')}
                </p>
                <p>
                  <strong>Status:</strong> {selectedWd.status}
                </p>
              </div>
              <div>
                <label className="block swas-label mb-1">Provider Reference</label>
                <input
                  type="text"
                  value={providerRef}
                  onChange={(e) => setProviderRef(e.target.value)}
                  placeholder="Required for Mark Paid..."
                  className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[8px]"
                />
              </div>
              <div>
                <label className="block swas-label mb-1">Tx Hash (Crypto Only)</label>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x... or TRON hash"
                  className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[8px]"
                />
              </div>
              <div>
                <label className="block swas-label mb-1">Review Note / Rejection Reason</label>
                <textarea
                  value={reasonNote}
                  onChange={(e) => setReasonNote(e.target.value)}
                  placeholder="Required if rejecting..."
                  className="w-full min-h-[68px] px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[8px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleAction('approve_for_payment')}
                  className="py-2 px-3 rounded-[8px] bg-[#e9f2ff] text-[#1265c8] text-[12px] font-semibold cursor-pointer"
                >
                  Approve for Payment
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleAction('mark_processing')}
                  className="py-2 px-3 rounded-[8px] bg-[#102b50] text-white text-[12px] font-semibold cursor-pointer"
                >
                  Mark Processing
                </button>
                <button
                  type="button"
                  disabled={busy || selectedWd.status === 'PAID' || selectedWd.status === 'paid'}
                  onClick={() => void handleAction('mark_paid')}
                  className="py-2 px-3 rounded-[8px] bg-[#15966b] text-white text-[12px] font-semibold disabled:opacity-50 cursor-pointer"
                >
                  Confirm Paid
                </button>
                <button
                  type="button"
                  disabled={busy || selectedWd.status === 'PAID' || selectedWd.status === 'paid'}
                  onClick={() => void handleAction('reject')}
                  className="py-2 px-3 rounded-[8px] bg-[#d34552] text-white text-[12px] font-semibold disabled:opacity-50 cursor-pointer"
                >
                  Reject &amp; Release
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Wallet Ledger */}
      <div className="swas-card rounded-[14px] p-6 space-y-3">
        <h3 className="swas-heading-section">
          Global Immutable Wallet Ledger ({allWalletLedger.length})
        </h3>
        {allWalletLedger.length === 0 ? (
          <p className="swas-body text-[#75869d]">No ledger entries recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse swas-table min-w-[760px]">
              <thead>
                <tr className="border-b border-[#e1e8f2] text-[#75869d]">
                  <th className="py-2 pr-3 font-semibold">Timestamp</th>
                  <th className="py-2 pr-3 font-semibold">User</th>
                  <th className="py-2 pr-3 font-semibold">Type</th>
                  <th className="py-2 pr-3 font-semibold">Amount</th>
                  <th className="py-2 pr-3 font-semibold">Idempotency Key</th>
                  <th className="py-2 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1e8f2]">
                {allWalletLedger.slice(0, 50).map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-2 pr-3 text-[#75869d] tabular-nums whitespace-nowrap">
                      {new Date(entry.createdAtMs).toLocaleString('en-KE')}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[11px]">{entry.userId.slice(0, 10)}</td>
                    <td className="py-2 pr-3 font-semibold text-[#172b46]">{entry.type}</td>
                    <td className="py-2 pr-3 font-bold tabular-nums">
                      {formatCurrency(entry.amount, entry.currency || 'KES')}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-[#1265c8]">
                      {entry.idempotencyKey}
                    </td>
                    <td className="py-2 text-[#42556f]">{entry.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Tab 7: Announcements, Audit Logs, Security Events & 9 CSV Reports ---
function GovernanceAndReportsTab({
  announcements,
  auditLogs,
  securityEvents,
}: {
  announcements: Announcement[];
  auditLogs: OperationalAuditLog[];
  securityEvents: SecurityEvent[];
}) {
  const { firebaseUser } = useAuth();
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annAudience, setAnnAudience] = useState<'all' | 'workers' | 'clients'>('all');
  const [annPriority, setAnnPriority] = useState<'normal' | 'important' | 'critical'>('normal');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setBusy(true);
    setNotice(null);
    try {
      await adminSaveAnnouncement(firebaseUser, {
        title: annTitle.trim(),
        body: annBody.trim(),
        audience: annAudience,
        priority: annPriority,
        published: true,
      });
      setAnnTitle('');
      setAnnBody('');
      setNotice({ ok: true, text: 'Published official platform announcement.' });
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to publish announcement.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadCsv = async (type: string) => {
    if (!firebaseUser) return;
    setBusy(true);
    setNotice(null);
    try {
      await downloadAdminCsvReport(firebaseUser, type);
      setNotice({ ok: true, text: `Downloaded swas-${type}-report.csv.` });
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : `Unable to download ${type} CSV report.`,
      });
    } finally {
      setBusy(false);
    }
  };

  const reportTypes = [
    { id: 'users', label: 'Users & Statuses' },
    { id: 'tasks', label: 'Dual-Source Tasks' },
    { id: 'submissions', label: 'Submissions & Timers' },
    { id: 'auto_approvals', label: 'Earnings & Auto-Approvals' },
    { id: 'corrections', label: 'Correction Requests' },
    { id: 'ledger', label: 'Wallet Ledger' },
    { id: 'withdrawals', label: 'Withdrawals Queue' },
    { id: 'referrals', label: 'Referrals' },
    { id: 'audit_logs', label: 'Audit Logs' },
  ];

  return (
    <div className="space-y-6">
      {notice && (
        <div
          className={`p-3.5 rounded-[10px] border text-[13px] ${
            notice.ok
              ? 'bg-[#eaf8f2] border-[#bce8d4] text-[#15966b]'
              : 'bg-[#fff0f0] border-[#f1c7c7] text-[#d34552]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* 9 Real CSV Report Exports */}
      <div className="swas-card rounded-[14px] p-6 space-y-3">
        <h3 className="swas-heading-section">Operational Reports &amp; CSV Export</h3>
        <p className="swas-desc">
          Generate live CSV exports directly from verified backend Firestore collections.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {reportTypes.map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={busy}
              onClick={() => void handleDownloadCsv(r.id)}
              className="flex items-center justify-between px-4 py-2.5 rounded-[9px] bg-[#f9fbfe] border border-[#dce5f0] text-[13px] font-semibold text-[#172b46] hover:bg-[#e9f2ff] hover:text-[#1265c8] cursor-pointer"
            >
              <span>{r.label}</span>
              <Download className="w-4 h-4 text-[#1265c8]" />
            </button>
          ))}
        </div>
      </div>

      {/* Announcements Publisher */}
      <form
        onSubmit={handlePublishAnnouncement}
        className="swas-card rounded-[14px] p-6 space-y-4"
      >
        <h3 className="swas-heading-section">
          Publish Official Announcement ({announcements.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block swas-label mb-1">Title</label>
            <input
              type="text"
              required
              minLength={3}
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              placeholder="System or operational announcement title..."
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>
          <div>
            <label className="block swas-label mb-1">Audience</label>
            <select
              value={annAudience}
              onChange={(e) => setAnnAudience(e.target.value as 'all' | 'workers' | 'clients')}
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            >
              <option value="all">All Users</option>
              <option value="workers">Workers Only</option>
              <option value="clients">Clients Only</option>
            </select>
          </div>
          <div>
            <label className="block swas-label mb-1">Priority</label>
            <select
              value={annPriority}
              onChange={(e) =>
                setAnnPriority(e.target.value as 'normal' | 'important' | 'critical')
              }
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            >
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="md:col-span-4">
            <label className="block swas-label mb-1">Announcement Body</label>
            <textarea
              required
              minLength={5}
              value={annBody}
              onChange={(e) => setAnnBody(e.target.value)}
              placeholder="Write bulletin details..."
              className="w-full min-h-[84px] px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="px-5 py-2 swas-btn-primary text-[13px] rounded-[9px] cursor-pointer"
        >
          Publish Announcement
        </button>
      </form>

      {/* Audit Logs + Security Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="swas-card rounded-[14px] p-6 space-y-3">
          <h3 className="swas-heading-section">
            Operational Audit Logs ({auditLogs.length})
          </h3>
          {auditLogs.length === 0 ? (
            <p className="swas-body text-[#75869d]">No operational audit logs recorded yet.</p>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto">
              {auditLogs.slice(0, 40).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-[9px] bg-[#f9fbfe] border border-[#e1e8f2] text-[12px] space-y-0.5"
                >
                  <div className="flex justify-between gap-2 font-semibold text-[#172b46]">
                    <span>{log.action.replace(/_/g, ' ')}</span>
                    <span className="text-[#75869d] tabular-nums">
                      {new Date(log.createdAtMs).toLocaleString('en-KE')}
                    </span>
                  </div>
                  <p className="text-[#42556f]">{log.details}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="swas-card rounded-[14px] p-6 space-y-3">
          <h3 className="swas-heading-section">Security Events ({securityEvents.length})</h3>
          {securityEvents.length === 0 ? (
            <p className="swas-body text-[#75869d]">No security events recorded yet.</p>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto">
              {securityEvents.slice(0, 40).map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-[9px] bg-[#f9fbfe] border border-[#e1e8f2] text-[12px] space-y-0.5"
                >
                  <div className="flex justify-between gap-2">
                    <span
                      className={`font-bold uppercase ${
                        ev.severity === 'critical'
                          ? 'text-[#d34552]'
                          : ev.severity === 'warning'
                          ? 'text-[#d99527]'
                          : 'text-[#1265c8]'
                      }`}
                    >
                      {ev.eventType}
                    </span>
                    <span className="text-[#75869d] tabular-nums">
                      {new Date(ev.createdAtMs).toLocaleString('en-KE')}
                    </span>
                  </div>
                  <p className="text-[#42556f]">{ev.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
