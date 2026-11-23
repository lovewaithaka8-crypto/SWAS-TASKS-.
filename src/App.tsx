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
  ALL_WORKSPACE_ROUTES,
  CLIENT_ONLY_ROUTES,
  WORKER_ONLY_ROUTES,
  type AppNotification,
  type AppRoute,
  type Conversation,
  type LedgerTransaction,
  type MarketplaceTask,
  type PublicRoute,
  type SavedTaskItem,
  type SupportTicket,
  type TaskAssignment,
  type TaskBid,
  type UserRole,
  type WalletAccount,
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
];

function isWorkspaceRoute(route: AppRoute): route is WorkspaceRoute {
  return ALL_WORKSPACE_ROUTES.includes(route as WorkspaceRoute);
}

function parseHashRoute(): AppRoute {
  const cleaned = window.location.hash.replace(/^#\/?/, '').trim();
  if (!cleaned) return 'home';
  if (ALL_WORKSPACE_ROUTES.includes(cleaned as WorkspaceRoute)) {
    return cleaned as WorkspaceRoute;
  }
  if (PUBLIC_ROUTES.includes(cleaned as PublicRoute)) {
    return cleaned as PublicRoute;
  }
  return 'home';
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
          We sent a verification link to <strong>{firebaseUser?.email}</strong>. Security rules require verified accounts before creating tasks, placing bids, or messaging.
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

function RoleOnboardingGate() {
  const { firebaseUser, completeOnboarding, logout } = useAuth();
  const [role, setRole] = useState<UserRole>('client');
  const [displayName, setDisplayName] = useState(firebaseUser?.displayName || '');
  const [businessName, setBusinessName] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      await completeOnboarding({
        role,
        displayName: displayName.trim() || undefined,
        businessName: role === 'client' ? businessName.trim() || undefined : undefined,
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
          <h1 className="swas-heading-page">Select your SWAS TASKS role</h1>
          <p className="mt-1 swas-desc">
            Choose your permanent workspace experience for this account.
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
              <span className="block swas-desc mt-0.5">Bid & complete tasks</span>
            </button>
          </div>

          <div>
            <label className="block swas-label mb-1">Display Name</label>
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
      </div>
    </div>
  );
}

function AppRouter() {
  const {
    firebaseUser,
    userPrivate,
    profileLoaded,
    needsOnboarding,
    authReady,
    logout,
  } = useAuth();

  const [route, setRoute] = useState<AppRoute>(() => parseHashRoute());
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHashRoute());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (nextRoute: AppRoute) => {
    setRoute(nextRoute);
    const targetHash = toHashString(nextRoute);
    if (window.location.hash !== targetHash) {
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
      setConversations([]);
      setNotifications([]);
      setSupportTickets([]);
      return;
    }

    const uid = firebaseUser.uid;
    const unsubs = [
      subscribeWallet(uid, setWallet),
      subscribeTransactions(uid, setTransactions),
      subscribeWithdrawals(uid, setWithdrawals),
      subscribeConversations(uid, setConversations),
      subscribeNotifications(uid, setNotifications),
      subscribeSupportTickets(uid, setSupportTickets),
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
      if (userPrivate.role === 'client' && WORKER_ONLY_ROUTES.includes(route)) {
        navigate('dashboard');
      } else if (userPrivate.role === 'worker' && CLIENT_ONLY_ROUTES.includes(route)) {
        navigate('dashboard');
      }
    }
  }, [authReady, firebaseUser, userPrivate?.role, route]);

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
        <Footer onNavigate={navigate} />
      </div>
    );
  }

  if (workspaceView && firebaseUser && needsOnboarding) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar currentRoute={route} onNavigate={navigate} />
        <RoleOnboardingGate />
        <Footer onNavigate={navigate} />
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
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
          notifications={notifications}
          supportTickets={supportTickets}
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
          onNavigate={navigate}
          onSelectTask={setSelectedTask}
        />
      </main>

      <Footer onNavigate={navigate} />

      <TaskDetailModal
        key={activeTask?.id || 'none'}
        task={activeTask}
        workerBids={workerBids}
        isSaved={isSavedTask}
        onClose={() => setSelectedTask(null)}
        onNavigate={navigate}
        onOpenChat={handleOpenChat}
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
