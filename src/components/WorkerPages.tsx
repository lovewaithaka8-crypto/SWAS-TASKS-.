import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Gavel,
  MessageSquare,
  Search,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  openOrCreateConversation,
  submitAssignmentWork,
  toggleSavedTask,
  withdrawBid,
} from '../lib/marketplaceService';
import { formatKes } from '../lib/validation';
import {
  TASK_CATEGORIES,
  type LedgerTransaction,
  type MarketplaceTask,
  type SavedTaskItem,
  type TaskAssignment,
  type TaskBid,
  type WalletAccount,
  type WorkspaceRoute,
} from '../types/marketplace';

interface WorkerPagesProps {
  route: WorkspaceRoute;
  headerSearch: string;
  publicTasks: MarketplaceTask[];
  workerBids: TaskBid[];
  workerAssignments: TaskAssignment[];
  savedTasks: SavedTaskItem[];
  wallet: WalletAccount | null;
  transactions: LedgerTransaction[];
  onSelectTask: (task: MarketplaceTask) => void;
  onNavigate: (route: WorkspaceRoute) => void;
  onOpenChat: (conversationId: string) => void;
}

export function WorkerPages({
  route,
  headerSearch,
  publicTasks,
  workerBids,
  workerAssignments,
  savedTasks,
  wallet,
  transactions,
  onSelectTask,
  onNavigate,
  onOpenChat,
}: WorkerPagesProps) {
  if (route === 'dashboard') {
    return (
      <WorkerOverview
        publicTasks={publicTasks}
        workerBids={workerBids}
        workerAssignments={workerAssignments}
        wallet={wallet}
        transactions={transactions}
        onSelectTask={onSelectTask}
        onNavigate={onNavigate}
      />
    );
  }
  if (route === 'browse-tasks') {
    return (
      <WorkerBrowseTasks
        headerSearch={headerSearch}
        publicTasks={publicTasks}
        savedTasks={savedTasks}
        workerBids={workerBids}
        onSelectTask={onSelectTask}
      />
    );
  }
  if (route === 'my-bids') {
    return (
      <WorkerBidsView
        workerBids={workerBids}
        publicTasks={publicTasks}
        onSelectTask={onSelectTask}
        onNavigate={onNavigate}
        onOpenChat={onOpenChat}
      />
    );
  }
  if (route === 'my-assignments') {
    return (
      <WorkerAssignmentsView
        workerAssignments={workerAssignments}
        onNavigate={onNavigate}
        onOpenChat={onOpenChat}
      />
    );
  }
  if (route === 'completed-work') {
    return (
      <WorkerCompletedView
        workerAssignments={workerAssignments}
        transactions={transactions}
        onNavigate={onNavigate}
      />
    );
  }
  if (route === 'saved-tasks') {
    return (
      <WorkerSavedTasksView
        savedTasks={savedTasks}
        publicTasks={publicTasks}
        onSelectTask={onSelectTask}
        onNavigate={onNavigate}
      />
    );
  }
  return null;
}

function WorkerOverview({
  publicTasks,
  workerBids,
  workerAssignments,
  wallet,
  transactions,
  onSelectTask,
  onNavigate,
}: {
  publicTasks: MarketplaceTask[];
  workerBids: TaskBid[];
  workerAssignments: TaskAssignment[];
  wallet: WalletAccount | null;
  transactions: LedgerTransaction[];
  onSelectTask: (task: MarketplaceTask) => void;
  onNavigate: (route: WorkspaceRoute) => void;
}) {
  const { userPrivate } = useAuth();
  const openTasks = useMemo(() => publicTasks.filter((t) => t.status === 'open'), [publicTasks]);
  const activeAssignments = useMemo(
    () => workerAssignments.filter((a) => a.status !== 'completed'),
    [workerAssignments]
  );
  const completedAssignments = useMemo(
    () => workerAssignments.filter((a) => a.status === 'completed'),
    [workerAssignments]
  );

  const settledEarnings = useMemo(
    () =>
      transactions
        .filter((tx) => tx.kind === 'earning' && tx.status === 'verified_settled')
        .reduce((sum, tx) => sum + tx.amountKes, 0),
    [transactions]
  );
  const pendingEarnings = useMemo(
    () =>
      transactions
        .filter((tx) => tx.kind === 'earning' && tx.status === 'pending_confirmation')
        .reduce((sum, tx) => sum + tx.amountKes, 0),
    [transactions]
  );

  const totalEarnings = Math.max(wallet?.availableKes ?? 0, settledEarnings);

  const kpis = [
    {
      label: 'Available Tasks',
      value: String(openTasks.length),
      sub: 'Open client briefs',
      icon: Briefcase,
      tone: 'text-[#172b46]',
      route: 'browse-tasks' as WorkspaceRoute,
    },
    {
      label: 'Submitted Bids',
      value: String(workerBids.length),
      sub: `${workerBids.filter((b) => b.status === 'pending').length} pending review`,
      icon: Gavel,
      tone: 'text-[#172b46]',
      route: 'my-bids' as WorkspaceRoute,
    },
    {
      label: 'Active Assignments',
      value: String(activeAssignments.length),
      sub: `${activeAssignments.filter((a) => a.status === 'revision_requested').length} revision requests`,
      icon: Clock,
      tone: 'text-[#2877d5]',
      route: 'my-assignments' as WorkspaceRoute,
    },
    {
      label: 'Completed Tasks',
      value: String(completedAssignments.length),
      sub: 'Approved deliverables',
      icon: ClipboardCheck,
      tone: 'text-[#15966b]',
      route: 'completed-work' as WorkspaceRoute,
    },
    {
      label: 'Total Earnings',
      value: formatKes(totalEarnings),
      sub: 'Verified settled KES',
      icon: Wallet,
      tone: 'text-[#15966b]',
      route: 'wallet' as WorkspaceRoute,
    },
    {
      label: 'Pending Earnings',
      value: formatKes(pendingEarnings),
      sub: 'Awaiting provider confirmation',
      icon: CheckCircle2,
      tone: 'text-[#d99527]',
      route: 'transactions' as WorkspaceRoute,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="swas-card rounded-[14px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium text-[#1265c8]">Worker Workspace</p>
          <h2 className="swas-heading-main mt-0.5">
            Welcome back, {userPrivate?.displayName || 'Worker'}
          </h2>
          <p className="swas-body mt-1">
            Browse live open briefs, track your KES proposals, and submit completed deliverables.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('browse-tasks')}
            className="px-4 py-2.5 swas-btn-primary swas-btn-text rounded-[9px] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Browse Tasks
          </button>
          <button
            type="button"
            onClick={() => onNavigate('my-assignments')}
            className="px-4 py-2.5 bg-[#e9f2ff] text-[#1265c8] hover:text-[#0d4fa5] swas-btn-text rounded-[9px] hover:bg-[#dcebff] whitespace-nowrap shrink-0 cursor-pointer"
          >
            My Assignments
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.route)}
              className="text-left swas-card-hover rounded-[13px] p-5 cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="swas-heading-card">{item.label}</span>
                <Icon className="w-[18px] h-[18px] text-[#2877d5]" />
              </div>
              <div className={`mt-2 swas-stat ${item.tone}`}>{item.value}</div>
              <p className="mt-1 swas-desc">{item.sub}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="swas-card rounded-[13px] p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="swas-heading-section">Active Assignments</h3>
            <button
              type="button"
              onClick={() => onNavigate('my-assignments')}
              className="text-[13px] font-semibold swas-link hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>
          {activeAssignments.length === 0 ? (
            <p className="swas-body">
              No active assignments right now. Accepted bids appear here immediately.
            </p>
          ) : (
            <div className="space-y-3">
              {activeAssignments.slice(0, 4).map((asn) => (
                <div
                  key={asn.id}
                  className="p-3.5 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#172b46] truncate">
                      {asn.taskTitle}
                    </p>
                    <p className="swas-desc mt-0.5">
                      Client: {asn.clientName} · Due {asn.deadline}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block text-[14px] font-bold text-[#172b46] tabular-nums">
                      {formatKes(asn.agreedKes)}
                    </span>
                    <span className="text-[11px] font-medium capitalize text-[#15966b]">
                      {asn.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="swas-card rounded-[13px] p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="swas-heading-section">Latest Open Tasks</h3>
            <button
              type="button"
              onClick={() => onNavigate('browse-tasks')}
              className="text-[13px] font-semibold swas-link hover:underline cursor-pointer"
            >
              Browse marketplace
            </button>
          </div>
          {openTasks.length === 0 ? (
            <p className="swas-body">No open client tasks published yet.</p>
          ) : (
            <div className="space-y-3">
              {openTasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#172b46] truncate">
                      {task.title}
                    </p>
                    <p className="swas-desc mt-0.5">
                      {task.category} · Due {task.deadline}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectTask(task)}
                    className="px-3 py-1.5 swas-btn-text bg-[#e9f2ff] text-[#1265c8] hover:text-[#0d4fa5] rounded-[8px] hover:bg-[#dcebff] tabular-nums whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {formatKes(task.budgetKes)}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkerBrowseTasks({
  headerSearch,
  publicTasks,
  savedTasks,
  workerBids,
  onSelectTask,
}: {
  headerSearch: string;
  publicTasks: MarketplaceTask[];
  savedTasks: SavedTaskItem[];
  workerBids: TaskBid[];
  onSelectTask: (task: MarketplaceTask) => void;
}) {
  const { firebaseUser } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | '7days' | '30days'>('all');
  const [statusFilter, setStatusFilter] = useState<'open' | 'all'>('open');
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [busySaveId, setBusySaveId] = useState<string | null>(null);

  const savedSet = useMemo(() => new Set(savedTasks.map((s) => s.taskId)), [savedTasks]);
  const bidMap = useMemo(() => {
    const map = new Map<string, TaskBid>();
    workerBids.forEach((b) => {
      if (b.status === 'pending' || b.status === 'accepted') {
        map.set(b.taskId, b);
      }
    });
    return map;
  }, [workerBids]);

  const effectiveQuery = (search || headerSearch).trim().toLowerCase();

  const filtered = useMemo(() => {
    const min = minBudget ? Number(minBudget) : null;
    const max = maxBudget ? Number(maxBudget) : null;
    const now = Date.now();
    const limitMs =
      deadlineFilter === '7days'
        ? now + 7 * 86400000
        : deadlineFilter === '30days'
        ? now + 30 * 86400000
        : null;

    const list = publicTasks.filter((t) => {
      if (statusFilter === 'open' && t.status !== 'open') return false;
      if (category !== 'All' && t.category !== category) return false;
      if (min !== null && Number.isFinite(min) && t.budgetKes < min) return false;
      if (max !== null && Number.isFinite(max) && t.budgetKes > max) return false;
      if (limitMs !== null) {
        const parsed = Date.parse(t.deadline);
        if (!Number.isNaN(parsed) && parsed > limitMs) return false;
      }
      if (effectiveQuery) {
        const match =
          t.title.toLowerCase().includes(effectiveQuery) ||
          t.description.toLowerCase().includes(effectiveQuery) ||
          t.clientName.toLowerCase().includes(effectiveQuery) ||
          (t.skills || []).some((s) => s.toLowerCase().includes(effectiveQuery));
        if (!match) return false;
      }
      return true;
    });

    if (sortBy === 'highest') return [...list].sort((a, b) => b.budgetKes - a.budgetKes);
    if (sortBy === 'lowest') return [...list].sort((a, b) => a.budgetKes - b.budgetKes);
    return list;
  }, [publicTasks, statusFilter, category, minBudget, maxBudget, deadlineFilter, effectiveQuery, sortBy]);

  const handleSaveToggle = async (task: MarketplaceTask) => {
    if (!firebaseUser) return;
    setBusySaveId(task.id);
    try {
      await toggleSavedTask(firebaseUser.uid, task, savedSet.has(task.id));
    } finally {
      setBusySaveId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="swas-card rounded-[13px] p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-[#75869d] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Keyword, skill, or client..."
              className="w-full pl-9 pr-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
            />
          </div>

          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
          >
            <option value="All">All Categories</option>
            {TASK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={0}
            value={minBudget}
            onChange={(e) => setMinBudget(e.target.value)}
            placeholder="Min KES"
            className="px-3 py-2 swas-input tabular-nums bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
          />

          <input
            type="number"
            min={0}
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
            placeholder="Max KES"
            className="px-3 py-2 swas-input tabular-nums bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
          />

          <select
            aria-label="Filter by deadline"
            value={deadlineFilter}
            onChange={(e) => setDeadlineFilter(e.target.value as 'all' | '7days' | '30days')}
            className="px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
          >
            <option value="all">Any Deadline</option>
            <option value="7days">Within 7 Days</option>
            <option value="30days">Within 30 Days</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-4 text-[12px]">
            <label className="inline-flex items-center gap-1.5 text-[#42556f] font-medium cursor-pointer">
              <input
                type="radio"
                name="task-status-filter"
                checked={statusFilter === 'open'}
                onChange={() => setStatusFilter('open')}
              />
              Open tasks only
            </label>
            <label className="inline-flex items-center gap-1.5 text-[#42556f] font-medium cursor-pointer">
              <input
                type="radio"
                name="task-status-filter"
                checked={statusFilter === 'all'}
                onChange={() => setStatusFilter('all')}
              />
              Include in-progress/closed
            </label>
          </div>

          <div className="flex items-center gap-3">
            <span className="swas-meta tabular-nums">
              {filtered.length} {filtered.length === 1 ? 'task' : 'tasks'}
            </span>
            <select
              aria-label="Sort tasks"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'highest' | 'lowest')}
              className="px-3 py-1.5 text-[13px] font-medium text-[#42556f] bg-[#f9fbfe] border border-[#d7e2ef] rounded-[8px] focus:outline-none focus:border-[#1265c8]"
            >
              <option value="newest">Newest First</option>
              <option value="highest">Highest KES</option>
              <option value="lowest">Lowest KES</option>
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="swas-card rounded-[13px] p-10 text-center">
          <h3 className="swas-heading-section">No tasks match your filters</h3>
          <p className="mt-1.5 swas-body text-[#75869d]">
            Clear your search or budget range to inspect all open tasks.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((task) => {
            const isSaved = savedSet.has(task.id);
            const activeBid = bidMap.get(task.id);
            return (
              <div
                key={task.id}
                className="swas-card-hover rounded-[13px] p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="swas-meta">
                      {task.category} · Due {task.deadline}
                    </p>
                    <button
                      type="button"
                      disabled={busySaveId === task.id}
                      onClick={() => handleSaveToggle(task)}
                      aria-label={isSaved ? 'Remove saved task' : 'Save task'}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        isSaved
                          ? 'bg-[#e9f2ff] border-[#1265c8] text-[#1265c8]'
                          : 'border-[#e1e8f2] text-[#75869d] hover:text-[#172b46]'
                      }`}
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="swas-heading-card text-[#172b46]">{task.title}</h3>
                  <p className="mt-2 swas-body line-clamp-3">{task.description}</p>
                  {task.skills && task.skills.length > 0 && (
                    <p className="mt-3 swas-desc">{task.skills.join(' · ')}</p>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-[#e1e8f2] flex items-center justify-between gap-3">
                  <div>
                    <span className="block text-[16px] font-bold text-[#172b46] tabular-nums">
                      {formatKes(task.budgetKes)}
                    </span>
                    <span className="swas-meta">
                      {activeBid ? `Bid: ${activeBid.status}` : `Client: ${task.clientName}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectTask(task)}
                    className="px-3.5 py-2 swas-btn-text swas-btn-primary rounded-[9px] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {activeBid ? 'View Bid' : 'View & Bid'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkerBidsView({
  workerBids,
  publicTasks,
  onSelectTask,
  onNavigate,
  onOpenChat,
}: {
  workerBids: TaskBid[];
  publicTasks: MarketplaceTask[];
  onSelectTask: (task: MarketplaceTask) => void;
  onNavigate: (route: WorkspaceRoute) => void;
  onOpenChat: (conversationId: string) => void;
}) {
  const { firebaseUser, userPrivate } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'withdrawn'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = useMemo(
    () => (statusFilter === 'all' ? workerBids : workerBids.filter((b) => b.status === statusFilter)),
    [workerBids, statusFilter]
  );

  const handleWithdraw = async (bidId: string) => {
    setBusyId(bidId);
    setFeedback(null);
    try {
      await withdrawBid(bidId);
      setFeedback('Bid withdrawn.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to withdraw bid.');
    } finally {
      setBusyId(null);
    }
  };

  const handleMessage = async (bid: TaskBid) => {
    if (!firebaseUser || !userPrivate) return;
    const convId = await openOrCreateConversation({
      senderId: firebaseUser.uid,
      senderName: userPrivate.displayName,
      recipientId: bid.clientId,
      recipientName: bid.clientName,
      taskId: bid.taskId,
      taskTitle: bid.taskTitle,
    });
    onOpenChat(convId);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'pending', 'accepted', 'rejected', 'withdrawn'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 swas-btn-text rounded-[8px] capitalize cursor-pointer ${
                statusFilter === s
                  ? 'bg-[#1265c8] text-white'
                  : 'bg-white border border-[#dce5f0] text-[#42556f] hover:bg-[#e9f2ff]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onNavigate('browse-tasks')}
          className="px-3.5 py-2 swas-btn-text swas-btn-primary rounded-[9px] cursor-pointer"
        >
          Find More Tasks
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-[9px] bg-[#e9f2ff] border border-[#b7cff0] text-[13px] font-medium text-[#172b46]">
          {feedback}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="swas-card rounded-[13px] p-10 text-center">
          <h3 className="swas-heading-section">No bids in this filter</h3>
          <p className="mt-1.5 swas-desc">
            Submit bids on open client briefs from Browse Tasks.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((bid) => {
            const matchedTask = publicTasks.find((t) => t.id === bid.taskId);
            const dateLabel = bid.createdAt?.toDate
              ? bid.createdAt.toDate().toLocaleDateString('en-KE', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Recently';
            return (
              <div key={bid.id} className="swas-card rounded-[13px] p-5 md:p-6 space-y-3">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div>
                    <p className="swas-meta">
                      Client: {bid.clientName} · Submitted {dateLabel} · {bid.deliveryDays}{' '}
                      {bid.deliveryDays === 1 ? 'day' : 'days'} delivery
                    </p>
                    <h3 className="swas-heading-card text-[#172b46] mt-1">{bid.taskTitle}</h3>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[16px] font-bold text-[#172b46] tabular-nums">
                      {formatKes(bid.amountKes)}
                    </span>
                    <span
                      className={`text-[12px] font-semibold capitalize ${
                        bid.status === 'accepted'
                          ? 'text-[#15966b]'
                          : bid.status === 'rejected'
                          ? 'text-[#d34552]'
                          : bid.status === 'withdrawn'
                          ? 'text-[#75869d]'
                          : 'text-[#d99527]'
                      }`}
                    >
                      {bid.status}
                    </span>
                  </div>
                </div>

                <p className="swas-body">{bid.proposal}</p>

                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  {matchedTask && (
                    <button
                      type="button"
                      onClick={() => onSelectTask(matchedTask)}
                      className="px-3 py-1.5 swas-btn-text bg-[#f3f6fa] text-[#172b46] rounded-[8px] hover:bg-[#e9f2ff] cursor-pointer"
                    >
                      View Task
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleMessage(bid)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 swas-btn-text bg-[#e9f2ff] text-[#1265c8] hover:text-[#0d4fa5] rounded-[8px] hover:bg-[#dcebff] cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Message Client
                  </button>
                  {bid.status === 'pending' && (
                    <button
                      type="button"
                      disabled={busyId === bid.id}
                      onClick={() => handleWithdraw(bid.id)}
                      className="px-3 py-1.5 swas-btn-text bg-[#fff0f0] text-[#d34552] rounded-[8px] hover:bg-[#ffe2e2] disabled:opacity-60 cursor-pointer"
                    >
                      {busyId === bid.id ? 'Withdrawing...' : 'Withdraw Bid'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkerAssignmentsView({
  workerAssignments,
  onNavigate,
  onOpenChat,
}: {
  workerAssignments: TaskAssignment[];
  onNavigate: (route: WorkspaceRoute) => void;
  onOpenChat: (conversationId: string) => void;
}) {
  const { firebaseUser, userPrivate } = useAuth();
  const activeList = useMemo(
    () => workerAssignments.filter((a) => a.status !== 'completed'),
    [workerAssignments]
  );

  const [openId, setOpenId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleOpenForm = (asn: TaskAssignment) => {
    setOpenId(asn.id);
    setNotes(asn.submissionNotes || '');
    setDeliverableUrl(asn.submissionUrl || '');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmitWork = async (e: React.FormEvent, asn: TaskAssignment) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await submitAssignmentWork(asn, {
        submissionNotes: notes,
        submissionUrl: deliverableUrl,
      });
      setSuccessMsg(`Work submitted for "${asn.taskTitle}".`);
      setOpenId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleMessageClient = async (asn: TaskAssignment) => {
    if (!firebaseUser || !userPrivate) return;
    const convId = await openOrCreateConversation({
      senderId: firebaseUser.uid,
      senderName: userPrivate.displayName,
      recipientId: asn.clientId,
      recipientName: asn.clientName,
      taskId: asn.taskId,
      taskTitle: asn.taskTitle,
    });
    onOpenChat(convId);
  };

  return (
    <div className="space-y-5">
      {successMsg && (
        <div className="p-3.5 rounded-[9px] bg-[#eaf8f2] border border-[#bce8d4] text-[13px] font-medium text-[#15966b]">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-[9px] bg-[#fff0f0] border border-[#f1c7c7] text-[13px] font-medium text-[#d34552]">
          {errorMsg}
        </div>
      )}

      {activeList.length === 0 ? (
        <div className="swas-card rounded-[13px] p-10 text-center">
          <h3 className="swas-heading-section">No active assignments</h3>
          <p className="mt-1.5 swas-desc">
            Once a client accepts one of your bids, the active assignment appears here.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('browse-tasks')}
            className="mt-4 px-4 py-2 swas-btn-text swas-btn-primary rounded-[9px] cursor-pointer"
          >
            Browse Open Tasks
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {activeList.map((asn) => {
            const canSubmit = asn.status === 'active' || asn.status === 'revision_requested';
            const isEditing = openId === asn.id;
            return (
              <div key={asn.id} className="swas-card rounded-[13px] p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div>
                    <p className="swas-meta">
                      Client: {asn.clientName} · Deadline {asn.deadline}
                    </p>
                    <h3 className="swas-heading-section mt-1">{asn.taskTitle}</h3>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[16px] font-bold text-[#172b46] tabular-nums">
                      {formatKes(asn.agreedKes)}
                    </span>
                    <span
                      className={`text-[12px] font-semibold capitalize ${
                        asn.status === 'revision_requested'
                          ? 'text-[#d34552]'
                          : asn.status === 'submitted'
                          ? 'text-[#2877d5]'
                          : 'text-[#15966b]'
                      }`}
                    >
                      {asn.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {asn.clientFeedback && (
                  <div className="p-3.5 rounded-[9px] bg-[#fff8ec] border border-[#f5dca8] text-[13px] text-[#9b6611]">
                    <strong>Client Feedback:</strong> {asn.clientFeedback}
                  </div>
                )}

                {asn.submissionNotes && (
                  <div className="p-3.5 rounded-[9px] bg-[#f9fbfe] border border-[#e1e8f2] space-y-1">
                    <p className="text-[13px] font-semibold text-[#172b46]">
                      Latest Deliverable Submission
                    </p>
                    <p className="swas-body">{asn.submissionNotes}</p>
                    {asn.submissionUrl && (
                      <a
                        href={asn.submissionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[13px] font-semibold swas-link hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open Deliverable Link
                      </a>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2.5">
                  {canSubmit && !isEditing && (
                    <button
                      type="button"
                      onClick={() => handleOpenForm(asn)}
                      className="px-4 py-2 swas-btn-text swas-btn-primary rounded-[9px] cursor-pointer"
                    >
                      {asn.status === 'revision_requested' ? 'Resubmit Work' : 'Submit Work'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleMessageClient(asn)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 swas-btn-text bg-[#e9f2ff] text-[#1265c8] hover:text-[#0d4fa5] rounded-[9px] hover:bg-[#dcebff] cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Message Client
                  </button>
                </div>

                {isEditing && (
                  <form
                    onSubmit={(e) => handleSubmitWork(e, asn)}
                    className="pt-4 border-t border-[#e1e8f2] space-y-3"
                  >
                    <div>
                      <label className="block swas-label mb-1">
                        Deliverable Summary & Verification Notes
                      </label>
                      <textarea
                        required
                        minLength={10}
                        maxLength={2000}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Summarize completed deliverables, files included, and testing notes..."
                        className="w-full min-h-[96px] px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
                      />
                    </div>
                    <div>
                      <label className="block swas-label mb-1">
                        Deliverable URL (Optional — Google Drive, GitHub, Figma, Loom)
                      </label>
                      <input
                        type="url"
                        maxLength={400}
                        value={deliverableUrl}
                        onChange={(e) => setDeliverableUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
                      />
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="submit"
                        disabled={busy}
                        className="px-4 py-2 swas-btn-text swas-btn-primary rounded-[9px] disabled:opacity-60 cursor-pointer"
                      >
                        {busy ? 'Sending...' : 'Confirm Submission'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenId(null)}
                        className="px-4 py-2 swas-btn-text bg-white border border-[#dce5f0] text-[#42556f] rounded-[9px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkerCompletedView({
  workerAssignments,
  transactions,
  onNavigate,
}: {
  workerAssignments: TaskAssignment[];
  transactions: LedgerTransaction[];
  onNavigate: (route: WorkspaceRoute) => void;
}) {
  const completed = useMemo(
    () => workerAssignments.filter((a) => a.status === 'completed'),
    [workerAssignments]
  );

  return (
    <div className="space-y-4">
      {completed.length === 0 ? (
        <div className="swas-card rounded-[13px] p-10 text-center">
          <h3 className="swas-heading-section">No completed work yet</h3>
          <p className="mt-1.5 swas-desc">
            Approved assignments and their settlement records appear here once a client verifies your submission.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('my-assignments')}
            className="mt-4 px-4 py-2 swas-btn-text bg-[#e9f2ff] text-[#1265c8] rounded-[9px] cursor-pointer"
          >
            Check Active Assignments
          </button>
        </div>
      ) : (
        completed.map((asn) => {
          const tx = transactions.find((t) => t.assignmentId === asn.id && t.kind === 'earning');
          return (
            <div key={asn.id} className="swas-card rounded-[13px] p-6 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="swas-meta">
                    Client: {asn.clientName} · Deadline {asn.deadline}
                  </p>
                  <h3 className="swas-heading-card text-[#172b46] mt-0.5">{asn.taskTitle}</h3>
                </div>
                <div className="sm:text-right">
                  <span className="block text-[16px] font-bold text-[#15966b] tabular-nums">
                    {formatKes(asn.agreedKes)}
                  </span>
                  <span className="swas-desc">
                    {tx?.status === 'verified_settled'
                      ? 'Verified Settled'
                      : 'Pending Provider Confirmation'}
                  </span>
                </div>
              </div>
              {asn.clientFeedback && (
                <p className="swas-desc text-[#42556f] bg-[#f9fbfe] border border-[#e1e8f2] rounded-[8px] p-3">
                  <strong>Client Approval Note:</strong> {asn.clientFeedback}
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function WorkerSavedTasksView({
  savedTasks,
  publicTasks,
  onSelectTask,
  onNavigate,
}: {
  savedTasks: SavedTaskItem[];
  publicTasks: MarketplaceTask[];
  onSelectTask: (task: MarketplaceTask) => void;
  onNavigate: (route: WorkspaceRoute) => void;
}) {
  const { firebaseUser } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);

  const handleOpenSaved = (saved: SavedTaskItem) => {
    const live = publicTasks.find((t) => t.id === saved.taskId);
    if (live) {
      setNotice(null);
      onSelectTask(live);
    } else {
      setNotice(`"${saved.taskTitle}" is no longer publicly open.`);
    }
  };

  const handleRemove = async (saved: SavedTaskItem) => {
    if (!firebaseUser) return;
    await toggleSavedTask(
      firebaseUser.uid,
      {
        id: saved.taskId,
        clientId: '',
        clientName: saved.clientName,
        title: saved.taskTitle,
        description: '',
        category: saved.category as MarketplaceTask['category'],
        budgetKes: saved.budgetKes,
        deadline: saved.deadline,
        visibility: 'public',
        status: 'open',
      },
      true
    );
  };

  return (
    <div className="space-y-4">
      {notice && (
        <div className="p-3.5 rounded-[9px] bg-[#fff8ec] border border-[#f5dca8] text-[13px] text-[#9b6611]">
          {notice}
        </div>
      )}

      {savedTasks.length === 0 ? (
        <div className="swas-card rounded-[13px] p-10 text-center">
          <h3 className="swas-heading-section">No saved tasks yet</h3>
          <p className="mt-1.5 swas-desc">
            Bookmark tasks while browsing to review their budgets and deadlines later.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('browse-tasks')}
            className="mt-4 px-4 py-2 swas-btn-text swas-btn-primary rounded-[9px] cursor-pointer"
          >
            Browse Tasks
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedTasks.map((saved) => (
            <div key={saved.id} className="swas-card rounded-[13px] p-5 flex flex-col justify-between gap-4">
              <div>
                <p className="swas-meta">
                  {saved.category} · Due {saved.deadline}
                </p>
                <h3 className="swas-heading-card text-[#172b46] mt-1">{saved.taskTitle}</h3>
                <p className="swas-desc mt-1">Client: {saved.clientName}</p>
              </div>
              <div className="pt-3 border-t border-[#e1e8f2] flex items-center justify-between gap-3">
                <span className="text-[16px] font-bold text-[#172b46] tabular-nums">
                  {formatKes(saved.budgetKes)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenSaved(saved)}
                    className="px-3 py-1.5 swas-btn-text swas-btn-primary rounded-[8px] cursor-pointer"
                  >
                    Open Task
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(saved)}
                    className="px-3 py-1.5 swas-btn-text bg-[#f3f6fa] text-[#42556f] rounded-[8px] hover:bg-[#ffe2e2] hover:text-[#d34552] cursor-pointer"
                  >
                    Remove
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
