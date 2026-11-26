/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { MailCheck, ShieldCheck } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { PublicPages } from './components/PublicPages';
import { TaskDetailModal } from './components/TaskDetailModal';
import { WorkspaceShell } from './components/WorkspaceShell';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  buildDefaultCentralEmailSettings,
  subscribeCentralEmailSettings,
  subscribeEmailLogs,
} from './lib/emailService';
import { buildDefaultFinancialPlatformConfig } from './lib/financialCatalog';
import {
  subscribeAllTransactions,
  subscribeAllWithdrawals,
  subscribeFinancialAuditLogs,
  subscribeFinancialConfig,
  subscribePayoutAccounts,
} from './lib/financialService';
import {
  subscribeClientAssignments,
  subscribeClientBids,
  subscribeClientTasks,
  subscribeConversations,
  subscribeNotifications,
  subscribePublicTasks,
  subscribeSavedTasks,
  subscribeSupportTickets,
  subscribeTransactions,
  subscribeWallet,
  subscribeWithdrawals,
  subscribeWorkerAssignments,
  subscribeWorkerBids,
} from './lib/marketplaceService';
import {
  mergePolicyCatalog,
  mergePolicyRevisions,
  subscribeAllPolicyAcceptances,
  subscribePolicies,
  subscribePolicyCategories,
  subscribePolicyRegistry,
  subscribePolicyRevisions,
  subscribeRegisteredUsersForAdmin,
  subscribeUserPolicyAcceptances,
} from './lib/policyService';
import { normalizePolicySlug, resolvePolicyBySlug, SIGNUP_REQUIRED_POLICY_SLUGS } from './lib/policies';
import {
  checkUsernameAvailability,
  subscribeAccountApplicationsAdmin,
  subscribeAllAnnouncementsAdmin,
  subscribeAllAuditLogsAdmin,
  subscribeAllCorrectionsAdmin,
  subscribeAllSecurityEventsAdmin,
  subscribeAllSubmissionsAdmin,
  subscribeAllTaskCategoriesAdmin,
  subscribeAllTasksAdmin,
  subscribeAllTimersAdmin,
  subscribeAllWalletLedgerAdmin,
  subscribeAutoApprovalSettings,
  subscribePublishedAnnouncements,
  subscribeTaskCategories,
  subscribeTaskReservationsForUser,
  subscribeTaskSourceImportsAdmin,
  subscribeTaskSourcesAdmin,
  subscribeTaskSubmissionsForUser,
  subscribeWalletLedgerForUser,
} from './lib/operationalService';
import { normalizeUsername, validatePhoneNumber, validateUsername } from './lib/validation';
import { PolicyReaderModal } from './components/PolicyCentrePages';
import {
  ADMIN_ONLY_ROUTES,
  ALL_WORKSPACE_ROUTES,
  CLIENT_ONLY_ROUTES,
  WORKER_ONLY_ROUTES,
  type AccountApplicationRecord,
  type AdminAutoApprovalSettings,
  type Announcement,
  type AppNotification,
  type AppRoute,
  type CentralEmailSettings,
  type Conversation,
  type EmailDeliveryLog,
  type FinancialAuditLog,
  type FinancialPlatformConfig,
  type LedgerTransaction,
  type MarketplaceTask,
  type OperationalAuditLog,
  type PayoutAccount,
  type PolicyAcceptanceRecord,
  type PolicyCategory,
  type PolicyDocument,
  type PolicyRegistryManifest,
  type PolicyRevision,
  type PublicRoute,
  type SavedTaskItem,
  type SecurityEvent,
  type SupportTicket,
  type TaskApprovalTimer,
  type TaskAssignment,
  type TaskBid,
  type TaskCategoryConfig,
  type TaskCorrection,
  type TaskReservation,
  type TaskSourceConfig,
  type TaskSourceImport,
  type TaskSubmission,
  type UserPrivate,
  type UserRole,
  type WalletAccount,
  type WalletLedgerEntry,
  type WithdrawalRequest,
  type WorkspaceRoute,
} from './types/marketplace';

const PUBLIC_ROUTES: PublicRoute[] = [
  'home',
  'about',
  'how',
  'tasks',
  'contact',
  'login',
  'signup',
  'forgot-password',
  'terms',
  'privacy',
  'refund',
  'policies',
];

function isWorkspaceRoute(route: AppRoute): route is WorkspaceRoute {
  return ALL_WORKSPACE_ROUTES.includes(route as WorkspaceRoute);
}

function parseLocation(): { route: AppRoute; policySlug: string | null } {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const cleanedHash = window.location.hash.replace(/^#\/?/, '').trim();

  if (pathname === '/policies' || pathname.startsWith('/policies/')) {
    const slugPart = pathname.slice('/policies'.length).replace(/^\/+/, '');
    return {
      route: 'policies',
      policySlug: slugPart ? normalizePolicySlug(slugPart) : null,
    };
  }

  if (cleanedHash === 'policies' || cleanedHash.startsWith('policies/')) {
    const slugPart = cleanedHash.slice('policies'.length).replace(/^\/+/, '');
    return {
      route: 'policies',
      policySlug: slugPart ? normalizePolicySlug(slugPart) : null,
    };
  }

  if (!cleanedHash) return { route: 'home', policySlug: null };
  if (ALL_WORKSPACE_ROUTES.includes(cleanedHash as WorkspaceRoute)) {
    return { route: cleanedHash as WorkspaceRoute, policySlug: null };
  }
  if (PUBLIC_ROUTES.includes(cleanedHash as PublicRoute)) {
    if (cleanedHash === 'terms') return { route: 'policies', policySlug: 'terms-and-conditions' };
    if (cleanedHash === 'privacy') return { route: 'policies', policySlug: 'privacy' };
    if (cleanedHash === 'refund') return { route: 'policies', policySlug: 'refund' };
    return { route: cleanedHash as PublicRoute, policySlug: null };
  }
  return { route: 'home', policySlug: null };
}

function toHashString(route: AppRoute): string {
  return route === 'home' ? '#/' : `#/${route}`;
}

function EmailVerificationGate({ onSignOut }: { onSignOut: () => void }) {
  const { firebaseUser, resendVerificationEmail, refreshVerificationState } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleRefresh = async () => {
    setBusy(true);
    setNotice(null);
    const verified = await refreshVerificationState();
    if (!verified) {
      setNotice('Email is not verified yet. Click the verification link in your inbox, then refresh.');
    }
    setBusy(false);
  };

  const handleResend = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await resendVerificationEmail();
      setNotice(`Verification link sent to ${firebaseUser?.email}.`);
    } catch {
      setNotice('Please wait a moment before requesting another verification email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5">
      <div className="max-w-md w-full swas-card rounded-[14px] p-7 space-y-4">
        <div className="flex items-center gap-2 text-[#1265c8]">
          <MailCheck className="w-5 h-5" />
          <span className="text-[12px] font-semibold uppercase tracking-wide">Email Verification Required</span>
        </div>
        <h1 className="swas-heading-page">Verify your email to open workspace</h1>
        <p className="swas-body">
          We sent a verification link to <strong>{firebaseUser?.email}</strong>. Security rules require verified accounts before creating tasks, placing bids, or messaging. Official platform inquiries:{' '}
          <a href="mailto:swastaskorg@gmail.com" className="swas-link font-semibold hover:underline">
            swastaskorg@gmail.com
          </a>
          .
        </p>

        {notice && (
          <div className="p-3 rounded-[9px] bg-[#e9f2ff] border border-[#b7cff0] text-[13px] text-[#172b46]">
            {notice}
          </div>
        )}

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleRefresh}
            className="w-full py-2.5 px-4 swas-btn-primary swas-btn-text rounded-[9px] disabled:opacity-60 cursor-pointer"
          >
            {busy ? 'Checking...' : "I've Verified — Refresh Workspace"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleResend}
            className="w-full py-2.5 px-4 bg-[#e9f2ff] text-[#1265c8] hover:text-[#0d4fa5] swas-btn-text rounded-[9px] hover:bg-[#dcebff] disabled:opacity-60 cursor-pointer"
          >
            Resend Verification Email
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="w-full py-2 px-4 text-[13px] font-semibold text-[#75869d] hover:text-[#d34552] cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleOnboardingGate({ policies }: { policies: PolicyDocument[] }) {
  const { firebaseUser, completeOnboarding, logout } = useAuth();
  const [role, setRole] = useState<UserRole>('client');
  const [displayName, setDisplayName] = useState(firebaseUser?.displayName || '');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('KE');
  const [businessName, setBusinessName] = useState('');
  const [acceptedPoliciesCheck, setAcceptedPoliciesCheck] = useState(false);
  const [modalPolicy, setModalPolicy] = useState<PolicyDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const requiredDocs = useMemo(
    () =>
      SIGNUP_REQUIRED_POLICY_SLUGS.map((s) => resolvePolicyBySlug(policies, s)).filter(
        (d): d is PolicyDocument => Boolean(d)
      ),
    [policies]
  );

  const handleUsernameBlur = async () => {
    const err = validateUsername(username);
    if (err) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    const ok = await checkUsernameAvailability(username);
    setUsernameStatus(ok ? 'available' : 'taken');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const uErr = validateUsername(username);
    if (uErr) {
      setErrorMsg(uErr);
      return;
    }
    if (usernameStatus === 'taken') {
      setErrorMsg(`Username "@${normalizeUsername(username)}" is already taken.`);
      return;
    }
    const pErr = validatePhoneNumber(phone);
    if (pErr) {
      setErrorMsg(pErr);
      return;
    }
    if (!acceptedPoliciesCheck) {
      setErrorMsg('Please review and accept the SWAS TASKS Policies before entering your workspace.');
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      await completeOnboarding({
        role,
        displayName: displayName.trim() || undefined,
        username: normalizeUsername(username),
        phone: phone.trim(),
        country,
        businessName: role === 'client' ? businessName.trim() || undefined : undefined,
        acceptedPolicies: requiredDocs.map((policy) => ({
          policy,
          context: 'google_onboarding',
        })),
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save workspace role.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-5 py-10">
      <div className="max-w-md w-full swas-card rounded-[14px] p-7 space-y-5">
        <div className="flex items-center gap-2 text-[#1265c8]">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[12px] font-semibold uppercase tracking-wide">Workspace Setup</span>
        </div>
        <div>
          <h1 className="swas-heading-page">Complete your SWAS TASKS profile</h1>
          <p className="mt-1 swas-desc">
            Select your permanent workspace role and provide verified contact details.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-[9px] bg-[#fff0f0] border border-[#f1c7c7] text-[13px] text-[#d34552]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('client')}
              className={`p-3.5 text-left rounded-[10px] border cursor-pointer ${
                role === 'client'
                  ? 'bg-[#e9f2ff] border-[#1265c8] text-[#172b46]'
                  : 'bg-[#f9fbfe] border-[#d7e2ef] text-[#42556f]'
              }`}
            >
              <span className="block text-[14px] font-semibold">Client</span>
              <span className="block swas-desc mt-0.5">Post briefs & hire</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('worker')}
              className={`p-3.5 text-left rounded-[10px] border cursor-pointer ${
                role === 'worker'
                  ? 'bg-[#e9f2ff] border-[#1265c8] text-[#172b46]'
                  : 'bg-[#f9fbfe] border-[#d7e2ef] text-[#42556f]'
              }`}
            >
              <span className="block text-[14px] font-semibold">Worker</span>
              <span className="block swas-desc mt-0.5">Claim & complete tasks</span>
            </button>
          </div>

          <div>
            <label className="block swas-label mb-1">Full Name</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>

          <div>
            <label className="block swas-label mb-1">Unique Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameStatus('idle');
              }}
              onBlur={() => void handleUsernameBlur()}
              placeholder="e.g. jane_doe_ke"
              className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
            {usernameStatus === 'available' && (
              <p className="text-[11px] text-[#15966b] mt-1">Username available.</p>
            )}
            {usernameStatus === 'taken' && (
              <p className="text-[11px] text-[#d34552] mt-1">Username is already taken.</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block swas-label mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+2547..."
                className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>
            <div>
              <label className="block swas-label mb-1">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              >
                <option value="KE">Kenya (KE)</option>
                <option value="UG">Uganda (UG)</option>
                <option value="TZ">Tanzania (TZ)</option>
                <option value="RW">Rwanda (RW)</option>
                <option value="NG">Nigeria (NG)</option>
                <option value="GH">Ghana (GH)</option>
                <option value="ZA">South Africa (ZA)</option>
                <option value="GB">United Kingdom (GB)</option>
                <option value="US">United States (US)</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {role === 'client' && (
            <div>
              <label className="block swas-label mb-1">
                Business / Organization (Optional)
              </label>
              <input
                type="text"
                maxLength={100}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Organization name"
                className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>
          )}

          <label className="flex items-start gap-2.5 text-[12px] text-[#2a3f5d] p-3 rounded-[9px] bg-[#f8fbff] border border-[#d7e2ef] cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedPoliciesCheck}
              onChange={(e) => setAcceptedPoliciesCheck(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[#b8c7da] text-[#1265c8]"
            />
            <span>
              I accept the{' '}
              <button
                type="button"
                onClick={() => setModalPolicy(resolvePolicyBySlug(policies, 'terms-and-conditions'))}
                className="font-semibold text-[#1265c8] hover:underline cursor-pointer"
              >
                Terms & Conditions
              </button>
              ,{' '}
              <button
                type="button"
                onClick={() => setModalPolicy(resolvePolicyBySlug(policies, 'privacy'))}
                className="font-semibold text-[#1265c8] hover:underline cursor-pointer"
              >
                Privacy Policy
              </button>
              ,{' '}
              <button
                type="button"
                onClick={() => setModalPolicy(resolvePolicyBySlug(policies, 'user-conduct'))}
                className="font-semibold text-[#1265c8] hover:underline cursor-pointer"
              >
                User Conduct
              </button>
              , and{' '}
              <button
                type="button"
                onClick={() => setModalPolicy(resolvePolicyBySlug(policies, 'earnings'))}
                className="font-semibold text-[#1265c8] hover:underline cursor-pointer"
              >
                Earnings Policy
              </button>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 px-4 swas-btn-primary swas-btn-text rounded-[9px] disabled:opacity-60 cursor-pointer"
          >
            {busy ? 'Creating Workspace...' : 'Continue to Dashboard'}
          </button>

          <button
            type="button"
            onClick={() => void logout()}
            className="w-full py-2 text-[13px] font-semibold text-[#75869d] hover:text-[#d34552] cursor-pointer"
          >
            Sign Out
          </button>
        </form>
        <PolicyReaderModal policy={modalPolicy} onClose={() => setModalPolicy(null)} />
      </div>
    </div>
  );
}

function AppRouter() {
  const {
    firebaseUser,
    userPrivate,
    isSuperAdmin,
    profileLoaded,
    needsOnboarding,
    authReady,
    logout,
  } = useAuth();

  const initialLocation = useMemo(() => parseLocation(), []);
  const [route, setRoute] = useState<AppRoute>(initialLocation.route);
  const [activePolicySlug, setActivePolicySlug] = useState<string | null>(initialLocation.policySlug);
  const [publicTasks, setPublicTasks] = useState<MarketplaceTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<MarketplaceTask | null>(null);

  const [workerBids, setWorkerBids] = useState<TaskBid[]>([]);
  const [workerAssignments, setWorkerAssignments] = useState<TaskAssignment[]>([]);
  const [savedTasks, setSavedTasks] = useState<SavedTaskItem[]>([]);

  const [clientTasks, setClientTasks] = useState<MarketplaceTask[]>([]);
  const [clientBids, setClientBids] = useState<TaskBid[]>([]);
  const [clientAssignments, setClientAssignments] = useState<TaskAssignment[]>([]);

  const [wallet, setWallet] = useState<WalletAccount | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [payoutAccounts, setPayoutAccounts] = useState<PayoutAccount[]>([]);
  const [financialConfig, setFinancialConfig] = useState<FinancialPlatformConfig>(() =>
    buildDefaultFinancialPlatformConfig()
  );
  const [allWithdrawals, setAllWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [allTransactions, setAllTransactions] = useState<LedgerTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<FinancialAuditLog[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [emailSettings, setEmailSettings] = useState<CentralEmailSettings>(() =>
    buildDefaultCentralEmailSettings()
  );
  const [emailLogs, setEmailLogs] = useState<EmailDeliveryLog[]>([]);

  // Policy Centre state
  const [categoryOverrides, setCategoryOverrides] = useState<PolicyCategory[]>([]);
  const [policyOverrides, setPolicyOverrides] = useState<PolicyDocument[]>([]);
  const [policyManifest, setPolicyManifest] = useState<PolicyRegistryManifest | null>(null);
  const [firestoreRevisions, setFirestoreRevisions] = useState<PolicyRevision[]>([]);
  const [userAcceptances, setUserAcceptances] = useState<PolicyAcceptanceRecord[]>([]);
  const [allPolicyAcceptances, setAllPolicyAcceptances] = useState<PolicyAcceptanceRecord[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<UserPrivate[]>([]);

  // Operational Centre state
  const [taskCategories, setTaskCategories] = useState<TaskCategoryConfig[]>([]);
  const [userSubmissions, setUserSubmissions] = useState<TaskSubmission[]>([]);
  const [userReservations, setUserReservations] = useState<TaskReservation[]>([]);
  const [userWalletLedger, setUserWalletLedger] = useState<WalletLedgerEntry[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [autoApprovalSettings, setAutoApprovalSettings] = useState<AdminAutoApprovalSettings>({
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

  // Super Admin Operational Centre state
  const [adminTasks, setAdminTasks] = useState<MarketplaceTask[]>([]);
  const [adminTaskCategories, setAdminTaskCategories] = useState<TaskCategoryConfig[]>([]);
  const [adminSubmissions, setAdminSubmissions] = useState<TaskSubmission[]>([]);
  const [adminApprovalTimers, setAdminApprovalTimers] = useState<TaskApprovalTimer[]>([]);
  const [adminTaskSources, setAdminTaskSources] = useState<TaskSourceConfig[]>([]);
  const [adminSourceImports, setAdminSourceImports] = useState<TaskSourceImport[]>([]);
  const [accountApplications, setAccountApplications] = useState<AccountApplicationRecord[]>([]);
  const [operationalAuditLogs, setOperationalAuditLogs] = useState<OperationalAuditLog[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [adminWalletLedger, setAdminWalletLedger] = useState<WalletLedgerEntry[]>([]);
  const [adminCorrections, setAdminCorrections] = useState<TaskCorrection[]>([]);
  const [adminAnnouncements, setAdminAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const syncFromUrl = () => {
      const parsed = parseLocation();
      setRoute(parsed.route);
      setActivePolicySlug(parsed.policySlug);
    };
    window.addEventListener('hashchange', syncFromUrl);
    window.addEventListener('popstate', syncFromUrl);
    return () => {
      window.removeEventListener('hashchange', syncFromUrl);
      window.removeEventListener('popstate', syncFromUrl);
    };
  }, []);

  const openPublicPolicy = (slug?: string | null) => {
    const normalized = slug ? normalizePolicySlug(slug) : null;
    const targetPath = normalized ? `/policies/${normalized}` : '/policies';
    if (window.location.pathname !== targetPath || window.location.hash) {
      window.history.pushState({}, '', targetPath);
    }
    setRoute('policies');
    setActivePolicySlug(normalized);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const navigate = (nextRoute: AppRoute) => {
    if (nextRoute === 'policies') {
      openPublicPolicy(null);
      return;
    }
    if (nextRoute === 'terms') {
      openPublicPolicy('terms-and-conditions');
      return;
    }
    if (nextRoute === 'privacy') {
      openPublicPolicy('privacy');
      return;
    }
    if (nextRoute === 'refund') {
      openPublicPolicy('refund');
      return;
    }

    setRoute(nextRoute);
    setActivePolicySlug(null);
    const targetHash = toHashString(nextRoute);
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', `/${targetHash}`);
    } else if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    setTasksLoading(true);
    const unsub = subscribePublicTasks(
      (items) => {
        setPublicTasks(items);
        setTasksLoading(false);
      },
      () => setTasksLoading(false)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubCats = subscribePolicyCategories(isSuperAdmin, setCategoryOverrides);
    const unsubPols = subscribePolicies(isSuperAdmin, setPolicyOverrides);
    const unsubReg = subscribePolicyRegistry(setPolicyManifest);
    const unsubRevs = subscribePolicyRevisions(isSuperAdmin, setFirestoreRevisions);
    return () => {
      unsubCats();
      unsubPols();
      unsubReg();
      unsubRevs();
    };
  }, [isSuperAdmin]);

  const mergedCatalog = useMemo(
    () =>
      mergePolicyCatalog({
        isAdmin: isSuperAdmin,
        categoryOverrides,
        policyOverrides,
        manifest: policyManifest,
      }),
    [isSuperAdmin, categoryOverrides, policyOverrides, policyManifest]
  );

  const mergedRevisions = useMemo(
    () => mergePolicyRevisions(firestoreRevisions, isSuperAdmin),
    [firestoreRevisions, isSuperAdmin]
  );

  useEffect(() => {
    if (!authReady || !firebaseUser) {
      setUserAcceptances([]);
      return;
    }
    return subscribeUserPolicyAcceptances(firebaseUser.uid, setUserAcceptances);
  }, [authReady, firebaseUser?.uid]);

  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified || !userPrivate) {
      setWorkerBids([]);
      setWorkerAssignments([]);
      setSavedTasks([]);
      setClientTasks([]);
      setClientBids([]);
      setClientAssignments([]);
      setWallet(null);
      setTransactions([]);
      setWithdrawals([]);
      setPayoutAccounts([]);
      setFinancialConfig(buildDefaultFinancialPlatformConfig());
      setConversations([]);
      setNotifications([]);
      setSupportTickets([]);
      setTaskCategories([]);
      setUserSubmissions([]);
      setUserReservations([]);
      setUserWalletLedger([]);
      setAnnouncements([]);
      return;
    }

    const uid = firebaseUser.uid;
    const unsubs = [
      subscribeWallet(uid, setWallet),
      subscribeTransactions(uid, setTransactions),
      subscribeWithdrawals(uid, setWithdrawals),
      subscribePayoutAccounts(uid, setPayoutAccounts),
      subscribeFinancialConfig(setFinancialConfig),
      subscribeConversations(uid, setConversations),
      subscribeNotifications(uid, setNotifications),
      subscribeSupportTickets(uid, setSupportTickets),
      subscribeTaskCategories(setTaskCategories),
      subscribeTaskSubmissionsForUser(uid, setUserSubmissions),
      subscribeTaskReservationsForUser(uid, setUserReservations),
      subscribeWalletLedgerForUser(uid, setUserWalletLedger),
      subscribePublishedAnnouncements(setAnnouncements),
      subscribeAutoApprovalSettings(setAutoApprovalSettings),
    ];

    if (userPrivate.role === 'worker') {
      unsubs.push(
        subscribeWorkerBids(uid, setWorkerBids),
        subscribeWorkerAssignments(uid, setWorkerAssignments),
        subscribeSavedTasks(uid, setSavedTasks)
      );
    } else {
      unsubs.push(
        subscribeClientTasks(uid, setClientTasks),
        subscribeClientBids(uid, setClientBids),
        subscribeClientAssignments(uid, setClientAssignments)
      );
    }

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [authReady, firebaseUser?.uid, firebaseUser?.emailVerified, userPrivate?.role]);

  useEffect(() => {
    if (!authReady || !firebaseUser || !isSuperAdmin) {
      setEmailSettings(buildDefaultCentralEmailSettings());
      setEmailLogs([]);
      setAllWithdrawals([]);
      setAllTransactions([]);
      setAuditLogs([]);
      setAllPolicyAcceptances([]);
      setRegisteredUsers([]);
      setAdminTasks([]);
      setAdminTaskCategories([]);
      setAdminSubmissions([]);
      setAdminApprovalTimers([]);
      setAdminTaskSources([]);
      setAdminSourceImports([]);
      setAccountApplications([]);
      setOperationalAuditLogs([]);
      setSecurityEvents([]);
      setAdminWalletLedger([]);
      setAdminCorrections([]);
      setAdminAnnouncements([]);
      return;
    }
    const unsubs = [
      subscribeCentralEmailSettings(setEmailSettings),
      subscribeEmailLogs(setEmailLogs),
      subscribeAllWithdrawals(setAllWithdrawals),
      subscribeAllTransactions(setAllTransactions),
      subscribeFinancialAuditLogs(setAuditLogs),
      subscribeAllPolicyAcceptances(setAllPolicyAcceptances),
      subscribeRegisteredUsersForAdmin(setRegisteredUsers),
      subscribeAllTasksAdmin(setAdminTasks),
      subscribeAllTaskCategoriesAdmin(setAdminTaskCategories),
      subscribeAllSubmissionsAdmin(setAdminSubmissions),
      subscribeAllTimersAdmin(setAdminApprovalTimers),
      subscribeTaskSourcesAdmin(setAdminTaskSources),
      subscribeTaskSourceImportsAdmin(setAdminSourceImports),
      subscribeAccountApplicationsAdmin(setAccountApplications),
      subscribeAllAuditLogsAdmin(setOperationalAuditLogs),
      subscribeAllSecurityEventsAdmin(setSecurityEvents),
      subscribeAllWalletLedgerAdmin(setAdminWalletLedger),
      subscribeAllCorrectionsAdmin(setAdminCorrections),
      subscribeAllAnnouncementsAdmin(setAdminAnnouncements),
    ];
    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [authReady, firebaseUser?.uid, isSuperAdmin]);

  // Role & Auth Route Guards
  useEffect(() => {
    if (!authReady) return;

    if (!firebaseUser && isWorkspaceRoute(route)) {
      navigate('login');
      return;
    }

    if (firebaseUser && (route === 'login' || route === 'signup' || route === 'forgot-password')) {
      navigate('dashboard');
      return;
    }

    if (userPrivate && isWorkspaceRoute(route)) {
      if (!isSuperAdmin && ADMIN_ONLY_ROUTES.includes(route)) {
        navigate('dashboard');
      } else if (userPrivate.role === 'client' && WORKER_ONLY_ROUTES.includes(route)) {
        navigate('dashboard');
      } else if (userPrivate.role === 'worker' && CLIENT_ONLY_ROUTES.includes(route)) {
        navigate('dashboard');
      }
    }
  }, [authReady, firebaseUser, userPrivate?.role, isSuperAdmin, route]);

  const handleOpenChat = (convId: string) => {
    setActiveConversationId(convId);
    navigate('messages');
  };

  const handleSignOut = async () => {
    await logout();
    navigate('home');
  };

  const activeTask = useMemo(() => {
    if (!selectedTask) return null;
    return publicTasks.find((t) => t.id === selectedTask.id) || selectedTask;
  }, [selectedTask, publicTasks]);

  const isSavedTask = Boolean(activeTask && savedTasks.some((s) => s.taskId === activeTask.id));

  const workspaceView = isWorkspaceRoute(route);

  if (!authReady && workspaceView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f6fa] text-sm text-[#75869d]">
        Loading SWAS TASKS workspace...
      </div>
    );
  }

  if (workspaceView && firebaseUser && !firebaseUser.emailVerified) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar currentRoute={route} onNavigate={navigate} />
        <EmailVerificationGate onSignOut={handleSignOut} />
        <Footer onNavigate={navigate} onOpenPolicy={(slug) => openPublicPolicy(slug)} />
      </div>
    );
  }

  if (workspaceView && firebaseUser && needsOnboarding) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar currentRoute={route} onNavigate={navigate} />
        <RoleOnboardingGate policies={mergedCatalog.policies} />
        <Footer onNavigate={navigate} onOpenPolicy={(slug) => openPublicPolicy(slug)} />
      </div>
    );
  }

  if (workspaceView && firebaseUser && (!profileLoaded || !userPrivate)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f6fa] text-sm text-[#75869d]">
        Initializing workspace profile...
      </div>
    );
  }

  if (workspaceView && firebaseUser && userPrivate) {
    return (
      <>
        <WorkspaceShell
          route={route}
          publicTasks={publicTasks}
          workerBids={workerBids}
          workerAssignments={workerAssignments}
          savedTasks={savedTasks}
          clientTasks={clientTasks}
          clientBids={clientBids}
          clientAssignments={clientAssignments}
          wallet={wallet}
          transactions={transactions}
          withdrawals={withdrawals}
          payoutAccounts={payoutAccounts}
          financialConfig={financialConfig}
          allWithdrawals={allWithdrawals}
          allTransactions={allTransactions}
          auditLogs={auditLogs}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
          notifications={notifications}
          supportTickets={supportTickets}
          emailSettings={emailSettings}
          emailLogs={emailLogs}
          policyCategories={mergedCatalog.categories}
          policies={mergedCatalog.policies}
          policyRevisions={mergedRevisions}
          policyManifest={policyManifest}
          userAcceptances={userAcceptances}
          allPolicyAcceptances={allPolicyAcceptances}
          registeredUsers={registeredUsers}
          taskCategories={taskCategories}
          userSubmissions={userSubmissions}
          userReservations={userReservations}
          userWalletLedger={userWalletLedger}
          announcements={announcements}
          autoApprovalSettings={autoApprovalSettings}
          adminTasks={adminTasks}
          adminTaskCategories={adminTaskCategories}
          adminSubmissions={adminSubmissions}
          adminApprovalTimers={adminApprovalTimers}
          adminTaskSources={adminTaskSources}
          adminSourceImports={adminSourceImports}
          accountApplications={accountApplications}
          operationalAuditLogs={operationalAuditLogs}
          securityEvents={securityEvents}
          adminWalletLedger={adminWalletLedger}
          adminCorrections={adminCorrections}
          adminAnnouncements={adminAnnouncements}
          onOpenPublicPolicy={openPublicPolicy}
          onNavigate={navigate}
          onSelectTask={setSelectedTask}
          onOpenChat={handleOpenChat}
          onNavigatePublicHome={() => navigate('home')}
          onSignOut={handleSignOut}
        />
        <TaskDetailModal
          key={activeTask?.id || 'none'}
          task={activeTask}
          workerBids={workerBids}
          isSaved={isSavedTask}
          onClose={() => setSelectedTask(null)}
          onNavigate={navigate}
          onOpenChat={handleOpenChat}
          onOpenPublicPolicy={openPublicPolicy}
        />
      </>
    );
  }

  const publicRoute: PublicRoute = PUBLIC_ROUTES.includes(route as PublicRoute)
    ? (route as PublicRoute)
    : 'home';

  return (
    <div className="min-h-screen flex flex-col text-[#172b46]">
      <Navbar currentRoute={publicRoute} onNavigate={navigate} />

      <main className="flex-1 pb-12">
        <PublicPages
          route={publicRoute}
          tasks={publicTasks}
          tasksLoading={tasksLoading}
          policyCategories={mergedCatalog.categories}
          policies={mergedCatalog.policies}
          policyRevisions={mergedRevisions}
          userAcceptances={userAcceptances}
          activePolicySlug={activePolicySlug}
          onOpenPolicy={openPublicPolicy}
          onNavigate={navigate}
          onSelectTask={setSelectedTask}
        />
      </main>

      <Footer onNavigate={navigate} onOpenPolicy={(slug) => openPublicPolicy(slug)} />

      <TaskDetailModal
        key={activeTask?.id || 'none'}
        task={activeTask}
        workerBids={workerBids}
        isSaved={isSavedTask}
        onClose={() => setSelectedTask(null)}
        onNavigate={navigate}
        onOpenChat={handleOpenChat}
        onOpenPublicPolicy={openPublicPolicy}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
}
