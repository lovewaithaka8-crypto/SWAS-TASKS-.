import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  FolderKanban,
  Gavel,
  MessageSquare,
  PlusCircle,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  acceptBidAndCreateAssignment,
  approveAssignmentWork,
  createTask,
  getPublicProfile,
  openOrCreateConversation,
  rejectBid,
  requestAssignmentRevision,
  updateClientTask,
} from '../lib/marketplaceService';
import { formatKes, parseSkillsInput, SCHEMA_LIMITS } from '../lib/validation';
import {
  TASK_CATEGORIES,
  type LedgerTransaction,
  type MarketplaceTask,
  type PublicProfile,
  type TaskAssignment,
  type TaskBid,
  type TaskCategory,
  type TaskVisibility,
  type WorkspaceRoute,
} from '../types/marketplace';

interface ClientPagesProps {
  route: WorkspaceRoute;
  headerSearch: string;
  clientTasks: MarketplaceTask[];
  clientBids: TaskBid[];
  clientAssignments: TaskAssignment[];
  transactions: LedgerTransaction[];
  onNavigate: (route: WorkspaceRoute) => void;
  onOpenChat: (conversationId: string) => void;
}

export function ClientPages({
  route,
  headerSearch,
  clientTasks,
  clientBids,
  clientAssignments,
  transactions,
  onNavigate,
  onOpenChat,
}: ClientPagesProps) {
  if (route === 'dashboard') {
    return (
      <ClientOverview
        clientTasks={clientTasks}
        clientBids={clientBids}
        clientAssignments={clientAssignments}
        transactions={transactions}
        onNavigate={onNavigate}
      />
    );
  }
  if (route === 'post-task') {
    return <PostTaskView onNavigate={onNavigate} />;
  }
  if (route === 'manage-tasks') {
    return (
      <ManageTasksView
        headerSearch={headerSearch}
        clientTasks={clientTasks}
        clientBids={clientBids}
        onNavigate={onNavigate}
      />
    );
  }
  if (route === 'received-bids') {
    return (
      <ReceivedBidsView
        headerSearch={headerSearch}
        clientTasks={clientTasks}
        clientBids={clientBids}
        onNavigate={onNavigate}
        onOpenChat={onOpenChat}
      />
    );
  }
  if (route === 'active-projects') {
    return (
      <ActiveProjectsView
        clientAssignments={clientAssignments}
        onNavigate={onNavigate}
        onOpenChat={onOpenChat}
      />
    );
  }
  if (route === 'completed-projects') {
    return (
      <CompletedProjectsView
        clientAssignments={clientAssignments}
        transactions={transactions}
        onNavigate={onNavigate}
      />
    );
  }
  return null;
}

function ClientOverview({
  clientTasks,
  clientBids,
  clientAssignments,
  transactions,
  onNavigate,
}: {
  clientTasks: MarketplaceTask[];
  clientBids: TaskBid[];
  clientAssignments: TaskAssignment[];
  transactions: LedgerTransaction[];
  onNavigate: (route: WorkspaceRoute) => void;
}) {
  const { userPrivate } = useAuth();
  const activeProjects = useMemo(
    () => clientAssignments.filter((a) => a.status !== 'completed'),
    [clientAssignments]
  );
  const completedProjects = useMemo(
    () => clientAssignments.filter((a) => a.status === 'completed'),
    [clientAssignments]
  );
  const pendingBids = useMemo(
    () => clientBids.filter((b) => b.status === 'pending'),
    [clientBids]
  );

  const totalSpending = useMemo(
    () =>
      transactions
        .filter((t) => t.kind === 'payment' && t.status === 'verified_settled')
        .reduce((sum, t) => sum + t.amountKes, 0),
    [transactions]
  );
  const pendingPayments = useMemo(
    () =>
      transactions
        .filter((t) => t.kind === 'payment' && t.status === 'pending_confirmation')
        .reduce((sum, t) => sum + t.amountKes, 0),
    [transactions]
  );

  const kpis = [
    {
      label: 'Published Tasks',
      value: String(clientTasks.length),
      sub: `${clientTasks.filter((t) => t.status === 'open').length} currently open`,
      icon: FolderKanban,
      tone: 'text-[#172b46]',
      route: 'manage-tasks' as WorkspaceRoute,
    },
    {
      label: 'Received Bids',
      value: String(clientBids.length),
      sub: `${pendingBids.length} awaiting decision`,
      icon: Gavel,
      tone: 'text-[#172b46]',
      route: 'received-bids' as WorkspaceRoute,
    },
    {
      label: 'Active Projects',
      value: String(activeProjects.length),
      sub: `${activeProjects.filter((a) => a.status === 'submitted').length} ready for review`,
      icon: Clock,
      tone: 'text-[#2877d5]',
      route: 'active-projects' as WorkspaceRoute,
    },
    {
      label: 'Completed Projects',
      value: String(completedProjects.length),
      sub: 'Approved & verified',
      icon: CheckCircle2,
      tone: 'text-[#15966b]',
      route: 'completed-projects' as WorkspaceRoute,
    },
    {
      label: 'Total Spending',
      value: formatKes(totalSpending),
      sub: 'Confirmed settled KES',
      icon: Wallet,
      tone: 'text-[#172b46]',
      route: 'payment-history' as WorkspaceRoute,
    },
    {
      label: 'Pending Payments',
      value: formatKes(pendingPayments),
      sub: 'Awaiting settlement confirmation',
      icon: UserCheck,
      tone: 'text-[#d99527]',
      route: 'transactions' as WorkspaceRoute,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="swas-card rounded-[14px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium text-[#1265c8]">Client Workspace</p>
          <h2 className="swas-heading-main mt-0.5">
            Welcome back, {userPrivate?.displayName || 'Client'}
          </h2>
          <p className="swas-body mt-1">
            Publish structured task briefs, review worker proposals, and oversee project deliverables.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('post-task')}
            className="inline-flex items-center gap-2 px-4 py-2.5 swas-btn-primary swas-btn-text rounded-[9px] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Post a Task
          </button>
          <button
            type="button"
            onClick={() => onNavigate('received-bids')}
            className="px-4 py-2.5 bg-[#e9f2ff] text-[#1265c8] hover:text-[#0d4fa5] swas-btn-text rounded-[9px] hover:bg-[#dcebff] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Received Bids ({pendingBids.length})
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
            <h3 className="swas-heading-section">Pending Bids to Review</h3>
            <button
              type="button"
              onClick={() => onNavigate('received-bids')}
              className="text-[13px] font-semibold swas-link hover:underline cursor-pointer"
            >
              View all bids
            </button>
          </div>
          {pendingBids.length === 0 ? (
            <p className="swas-body">
              No pending bids right now. Open tasks appear publicly for workers to bid.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingBids.slice(0, 4).map((bid) => (
                <div
                  key={bid.id}
                  className="p-3.5 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#172b46] truncate">
                      {bid.taskTitle}
                    </p>
                    <p className="swas-desc mt-0.5">
                      Worker: {bid.workerName} · {bid.deliveryDays} days
                    </p>
                  </div>
                  <span className="text-[14px] font-bold text-[#172b46] tabular-nums shrink-0">
                    {formatKes(bid.amountKes)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="swas-card rounded-[13px] p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="swas-heading-section">Active Projects</h3>
            <button
              type="button"
              onClick={() => onNavigate('active-projects')}
              className="text-[13px] font-semibold swas-link hover:underline cursor-pointer"
            >
              Manage projects
            </button>
          </div>
          {activeProjects.length === 0 ? (
            <p className="swas-body">Accept a bid to launch an active project assignment.</p>
          ) : (
            <div className="space-y-3">
              {activeProjects.slice(0, 4).map((asn) => (
                <div
                  key={asn.id}
                  className="p-3.5 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#172b46] truncate">
                      {asn.taskTitle}
                    </p>
                    <p className="swas-desc mt-0.5">
                      Worker: {asn.workerName} · Due {asn.deadline}
                    </p>
                  </div>
                  <span
                    className={`text-[12px] font-semibold capitalize shrink-0 ${
                      asn.status === 'submitted' ? 'text-[#2877d5]' : 'text-[#15966b]'
                    }`}
                  >
                    {asn.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PostTaskView({ onNavigate }: { onNavigate: (route: WorkspaceRoute) => void }) {
  const { firebaseUser, userPrivate } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>(TASK_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [skillsRaw, setSkillsRaw] = useState('');
  const [budgetKes, setBudgetKes] = useState('2500');
  const [deadline, setDeadline] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [visibility, setVisibility] = useState<TaskVisibility>('public');
  const [initialStatus, setInitialStatus] = useState<'open' | 'paused'>('open');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userPrivate) return;
    setBusy(true);
    setErrorMsg(null);
    setCreatedId(null);
    try {
      const id = await createTask(firebaseUser.uid, userPrivate.displayName, {
        title,
        description,
        category,
        skills: parseSkillsInput(skillsRaw, SCHEMA_LIMITS.taskSkillsMaxCount),
        budgetKes: Number(budgetKes),
        deadline,
        attachmentUrl,
        visibility,
        status: initialStatus,
      });
      setCreatedId(id);
      setTitle('');
      setDescription('');
      setSkillsRaw('');
      setAttachmentUrl('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to publish task.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="swas-card rounded-[14px] p-6 md:p-8">
        <h2 className="swas-heading-page">Publish a New Task Brief</h2>
        <p className="swas-body mt-1">
          Specify deliverables, skills, KES budget, and deadline for qualified workers to bid.
        </p>

        {createdId && (
          <div className="mt-4 p-4 rounded-[9px] bg-[#eaf8f2] border border-[#bce8d4] text-[13px] text-[#15966b] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>Task brief published successfully.</span>
            <button
              type="button"
              onClick={() => onNavigate('manage-tasks')}
              className="px-3.5 py-1.5 swas-btn-text bg-white border border-[#bce8d4] text-[#15966b] rounded-[8px] cursor-pointer"
            >
              View in Manage Tasks
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-[9px] bg-[#fff0f0] border border-[#f1c7c7] text-[13px] text-[#d34552]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="task-title" className="block swas-label mb-1.5">
                Task Title
              </label>
              <input
                id="task-title"
                type="text"
                required
                minLength={5}
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Audit 120 Nairobi retail product listings in Excel"
                className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
              />
            </div>

            <div>
              <label htmlFor="task-cat" className="block swas-label mb-1.5">
                Category
              </label>
              <select
                id="task-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
              >
                {TASK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-budget" className="block swas-label mb-1.5">
                Budget (KES)
              </label>
              <input
                id="task-budget"
                type="number"
                required
                min={50}
                max={5000000}
                value={budgetKes}
                onChange={(e) => setBudgetKes(e.target.value)}
                className="w-full px-3.5 py-2.5 swas-input tabular-nums bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
              />
            </div>

            <div>
              <label htmlFor="task-deadline" className="block swas-label mb-1.5">
                Deadline Date
              </label>
              <input
                id="task-deadline"
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
              />
            </div>

            <div>
              <label htmlFor="task-skills" className="block swas-label mb-1.5">
                Required Skills (comma-separated, max 8)
              </label>
              <input
                id="task-skills"
                type="text"
                value={skillsRaw}
                onChange={(e) => setSkillsRaw(e.target.value)}
                placeholder="Excel, Market Research, Data QA"
                className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="task-desc" className="block swas-label mb-1.5">
                Task Scope & Acceptance Criteria
              </label>
              <textarea
                id="task-desc"
                required
                minLength={15}
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe expected output format, quality checks, and delivery instructions..."
                className="w-full min-h-[120px] px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="task-attach" className="block swas-label mb-1.5">
                Reference Brief / Attachment URL (Optional)
              </label>
              <input
                id="task-attach"
                type="url"
                maxLength={400}
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
              />
            </div>

            <div>
              <label htmlFor="task-vis" className="block swas-label mb-1.5">
                Visibility
              </label>
              <select
                id="task-vis"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as TaskVisibility)}
                className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
              >
                <option value="public">Public (Listed on Browse Tasks)</option>
                <option value="invite_only">Private Draft / Invite Only</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-init" className="block swas-label mb-1.5">
                Initial Status
              </label>
              <select
                id="task-init"
                value={initialStatus}
                onChange={(e) => setInitialStatus(e.target.value as 'open' | 'paused')}
                className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
              >
                <option value="open">Open for Bidding</option>
                <option value="paused">Paused (Publish Later)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 swas-btn-primary swas-btn-text rounded-[9px] disabled:opacity-60 cursor-pointer"
            >
              {busy ? 'Publishing...' : 'Publish Task'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('manage-tasks')}
              className="px-4 py-2.5 bg-white border border-[#dce5f0] swas-btn-text text-[#42556f] rounded-[9px] hover:bg-[#e9f2ff] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ManageTasksView({
  headerSearch,
  clientTasks,
  clientBids,
  onNavigate,
}: {
  headerSearch: string;
  clientTasks: MarketplaceTask[];
  clientBids: TaskBid[];
  onNavigate: (route: WorkspaceRoute) => void;
}) {
  const [editingTask, setEditingTask] = useState<MarketplaceTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = headerSearch.trim().toLowerCase();
    if (!q) return clientTasks;
    return clientTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }, [clientTasks, headerSearch]);

  const startEdit = (t: MarketplaceTask) => {
    setEditingTask(t);
    setEditTitle(t.title);
    setEditDesc(t.description);
    setEditBudget(String(t.budgetKes));
    setEditDeadline(t.deadline);
    setFeedback(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setBusyId(editingTask.id);
    try {
      await updateClientTask(editingTask.id, {
        title: editTitle,
        description: editDesc,
        budgetKes: Number(editBudget),
        deadline: editDeadline,
      });
      setFeedback('Task details updated.');
      setEditingTask(null);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to update task.');
    } finally {
      setBusyId(null);
    }
  };

  const handleStatusChange = async (task: MarketplaceTask, nextStatus: 'open' | 'paused' | 'closed') => {
    setBusyId(task.id);
    setFeedback(null);
    try {
      await updateClientTask(task.id, { status: nextStatus });
      setFeedback(`Task "${task.title}" set to ${nextStatus}.`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to update task status.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="swas-body text-[#75869d]">
          Showing <strong className="text-[#172b46] tabular-nums">{filtered.length}</strong> client tasks
        </p>
        <button
          type="button"
          onClick={() => onNavigate('post-task')}
          className="inline-flex items-center gap-1.5 px-4 py-2 swas-btn-text swas-btn-primary rounded-[9px] cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Post New Task
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-[9px] bg-[#e9f2ff] border border-[#b7cff0] text-[13px] font-medium text-[#172b46]">
          {feedback}
        </div>
      )}

      {editingTask && (
        <form
          onSubmit={handleSaveEdit}
          className="swas-card rounded-[13px] p-6 space-y-4 border-[#1265c8]"
        >
          <h3 className="swas-heading-section">Edit Task: {editingTask.title}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block swas-label mb-1">Title</label>
              <input
                type="text"
                required
                minLength={5}
                maxLength={120}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>
            <div>
              <label className="block swas-label mb-1">Budget (KES)</label>
              <input
                type="number"
                required
                min={50}
                max={5000000}
                value={editBudget}
                onChange={(e) => setEditBudget(e.target.value)}
                className="w-full px-3 py-2 swas-input tabular-nums bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>
            <div>
              <label className="block swas-label mb-1">Deadline</label>
              <input
                type="date"
                required
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block swas-label mb-1">Description</label>
              <textarea
                required
                minLength={15}
                maxLength={2000}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full min-h-[96px] px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              type="submit"
              disabled={busyId === editingTask.id}
              className="px-4 py-2 swas-btn-text swas-btn-primary rounded-[9px] cursor-pointer"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setEditingTask(null)}
              className="px-4 py-2 swas-btn-text bg-white border border-[#dce5f0] text-[#42556f] rounded-[9px] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="swas-card rounded-[13px] p-10 text-center">
          <h3 className="swas-heading-section">No published tasks yet</h3>
          <p className="mt-1.5 swas-desc">
            Create your first task brief to begin receiving competitive bids from workers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((task) => {
            const bidCount = clientBids.filter((b) => b.taskId === task.id).length;
            const canModify = task.status === 'open' || task.status === 'paused';
            return (
              <div key={task.id} className="swas-card rounded-[13px] p-6 space-y-3">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div>
                    <p className="swas-meta">
                      {task.category} · Due {task.deadline} · {task.visibility.replace('_', ' ')} ·{' '}
                      {bidCount} {bidCount === 1 ? 'bid' : 'bids'}
                    </p>
                    <h3 className="swas-heading-section mt-1">{task.title}</h3>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[16px] font-bold text-[#172b46] tabular-nums">
                      {formatKes(task.budgetKes)}
                    </span>
                    <span
                      className={`text-[12px] font-semibold capitalize ${
                        task.status === 'open'
                          ? 'text-[#15966b]'
                          : task.status === 'paused'
                          ? 'text-[#d99527]'
                          : task.status === 'closed'
                          ? 'text-[#d34552]'
                          : 'text-[#2877d5]'
                      }`}
                    >
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <p className="swas-body">{task.description}</p>

                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  {canModify && (
                    <button
                      type="button"
                      onClick={() => startEdit(task)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 swas-btn-text bg-[#f3f6fa] text-[#172b46] rounded-[8px] hover:bg-[#e9f2ff] cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Task
                    </button>
                  )}
                  {task.status === 'open' && (
                    <button
                      type="button"
                      disabled={busyId === task.id}
                      onClick={() => handleStatusChange(task, 'paused')}
                      className="px-3 py-1.5 swas-btn-text bg-[#fff8ec] text-[#d99527] rounded-[8px] cursor-pointer"
                    >
                      Pause
                    </button>
                  )}
                  {task.status === 'paused' && (
                    <button
                      type="button"
                      disabled={busyId === task.id}
                      onClick={() => handleStatusChange(task, 'open')}
                      className="px-3 py-1.5 swas-btn-text bg-[#eaf8f2] text-[#15966b] rounded-[8px] cursor-pointer"
                    >
                      Reopen
                    </button>
                  )}
                  {(task.status === 'open' || task.status === 'paused') && (
                    <button
                      type="button"
                      disabled={busyId === task.id}
                      onClick={() => handleStatusChange(task, 'closed')}
                      className="px-3 py-1.5 swas-btn-text bg-[#fff0f0] text-[#d34552] rounded-[8px] cursor-pointer"
                    >
                      Close Task
                    </button>
                  )}
                  {bidCount > 0 && (
                    <button
                      type="button"
                      onClick={() => onNavigate('received-bids')}
                      className="px-3 py-1.5 swas-btn-text bg-[#e9f2ff] text-[#1265c8] hover:text-[#0d4fa5] rounded-[8px] cursor-pointer"
                    >
                      Inspect Bids ({bidCount})
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

function ReceivedBidsView({
  headerSearch,
  clientTasks,
  clientBids,
  onNavigate,
  onOpenChat,
}: {
  headerSearch: string;
  clientTasks: MarketplaceTask[];
  clientBids: TaskBid[];
  onNavigate: (route: WorkspaceRoute) => void;
  onOpenChat: (conversationId: string) => void;
}) {
  const { firebaseUser, userPrivate } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'withdrawn'>('all');
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [workerProfiles, setWorkerProfiles] = useState<Record<string, PublicProfile | null>>({});
  const [openProfileWorkerId, setOpenProfileWorkerId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = headerSearch.trim().toLowerCase();
    return clientBids.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (taskFilter !== 'all' && b.taskId !== taskFilter) return false;
      if (q) {
        const match =
          b.taskTitle.toLowerCase().includes(q) ||
          b.workerName.toLowerCase().includes(q) ||
          b.proposal.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [clientBids, statusFilter, taskFilter, headerSearch]);

  const toggleWorkerProfile = async (workerId: string) => {
    if (openProfileWorkerId === workerId) {
      setOpenProfileWorkerId(null);
      return;
    }
    setOpenProfileWorkerId(workerId);
    if (!(workerId in workerProfiles)) {
      const profile = await getPublicProfile(workerId);
      setWorkerProfiles((prev) => ({ ...prev, [workerId]: profile }));
    }
  };

  const handleAccept = async (bid: TaskBid) => {
    if (!firebaseUser) return;
    setBusyId(bid.id);
    setFeedback(null);
    try {
      await acceptBidAndCreateAssignment(bid, firebaseUser.uid);
      setFeedback(`Accepted bid from ${bid.workerName}. Active project launched.`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to accept bid.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (bid: TaskBid) => {
    if (!firebaseUser) return;
    setBusyId(bid.id);
    setFeedback(null);
    try {
      await rejectBid(bid, firebaseUser.uid);
      setFeedback(`Declined bid from ${bid.workerName}.`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to decline bid.');
    } finally {
      setBusyId(null);
    }
  };

  const handleMessageWorker = async (bid: TaskBid) => {
    if (!firebaseUser || !userPrivate) return;
    const convId = await openOrCreateConversation({
      senderId: firebaseUser.uid,
      senderName: userPrivate.displayName,
      recipientId: bid.workerId,
      recipientName: bid.workerName,
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

        <select
          aria-label="Filter bids by task"
          value={taskFilter}
          onChange={(e) => setTaskFilter(e.target.value)}
          className="px-3 py-1.5 text-[13px] font-medium text-[#42556f] bg-white border border-[#dce5f0] rounded-[8px]"
        >
          <option value="all">All Client Tasks</option>
          {clientTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-[9px] bg-[#e9f2ff] border border-[#b7cff0] text-[13px] font-medium text-[#172b46] flex items-center justify-between gap-3">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => onNavigate('active-projects')}
            className="swas-link font-semibold hover:underline cursor-pointer"
          >
            Open Active Projects
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="swas-card rounded-[13px] p-10 text-center">
          <h3 className="swas-heading-section">No incoming bids match this view</h3>
          <p className="mt-1.5 swas-desc">
            Publish open tasks in Post a Task so workers can submit KES proposals.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((bid) => {
            const inspectedProfile = workerProfiles[bid.workerId];
            const showProfile = openProfileWorkerId === bid.workerId;
            return (
              <div key={bid.id} className="swas-card rounded-[13px] p-6 space-y-3">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div>
                    <p className="swas-meta">
                      Task: {bid.taskTitle} · Delivery in {bid.deliveryDays}{' '}
                      {bid.deliveryDays === 1 ? 'day' : 'days'}
                    </p>
                    <h3 className="swas-heading-card text-[#172b46] mt-1">
                      Worker: {bid.workerName}
                    </h3>
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
                          : 'text-[#d99527]'
                      }`}
                    >
                      {bid.status}
                    </span>
                  </div>
                </div>

                <p className="swas-body">{bid.proposal}</p>

                {showProfile && (
                  <div className="p-4 rounded-[10px] bg-[#f9fbfe] border border-[#dce5f0] space-y-1.5">
                    <p className="text-[13px] font-semibold text-[#172b46]">
                      Worker Public Profile — {inspectedProfile?.displayName || bid.workerName}
                    </p>
                    {inspectedProfile?.bio ? (
                      <p className="swas-body">{inspectedProfile.bio}</p>
                    ) : (
                      <p className="swas-desc">No bio added by worker yet.</p>
                    )}
                    {inspectedProfile?.skills && inspectedProfile.skills.length > 0 && (
                      <p className="text-[12px] text-[#1265c8] font-medium">
                        Skills: {inspectedProfile.skills.join(' · ')}
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => toggleWorkerProfile(bid.workerId)}
                    className="px-3 py-1.5 swas-btn-text bg-[#f3f6fa] text-[#172b46] rounded-[8px] hover:bg-[#e9f2ff] cursor-pointer"
                  >
                    {showProfile ? 'Hide Worker Profile' : 'Worker Profile'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMessageWorker(bid)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 swas-btn-text bg-[#e9f2ff] text-[#1265c8] hover:text-[#0d4fa5] rounded-[8px] hover:bg-[#dcebff] cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Message Worker
                  </button>
                  {bid.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        disabled={busyId === bid.id}
                        onClick={() => handleAccept(bid)}
                        className="px-3.5 py-1.5 swas-btn-text swas-btn-primary rounded-[8px] disabled:opacity-60 cursor-pointer"
                      >
                        {busyId === bid.id ? 'Processing...' : 'Accept Bid'}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === bid.id}
                        onClick={() => handleReject(bid)}
                        className="px-3.5 py-1.5 swas-btn-text bg-[#fff0f0] text-[#d34552] rounded-[8px] hover:bg-[#ffe2e2] disabled:opacity-60 cursor-pointer"
                      >
                        Reject
                      </button>
                    </>
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

function ActiveProjectsView({
  clientAssignments,
  onNavigate,
  onOpenChat,
}: {
  clientAssignments: TaskAssignment[];
  onNavigate: (route: WorkspaceRoute) => void;
  onOpenChat: (conversationId: string) => void;
}) {
  const { firebaseUser, userPrivate } = useAuth();
  const active = useMemo(
    () => clientAssignments.filter((a) => a.status !== 'completed'),
    [clientAssignments]
  );

  const [revisionId, setRevisionId] = useState<string | null>(null);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRequestRevision = async (e: React.FormEvent, asn: TaskAssignment) => {
    e.preventDefault();
    setBusyId(asn.id);
    setNotice(null);
    setErrorMsg(null);
    try {
      await requestAssignmentRevision(asn, feedbackInput);
      setNotice(`Revision requested from ${asn.workerName} on "${asn.taskTitle}".`);
      setRevisionId(null);
      setFeedbackInput('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send revision request.');
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = async (asn: TaskAssignment) => {
    setBusyId(asn.id);
    setNotice(null);
    setErrorMsg(null);
    try {
      await approveAssignmentWork(asn);
      setNotice(
        `Approved "${asn.taskTitle}". Pending KES ledger entry recorded awaiting backend settlement confirmation.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to approve submission.');
    } finally {
      setBusyId(null);
    }
  };

  const handleMessageWorker = async (asn: TaskAssignment) => {
    if (!firebaseUser || !userPrivate) return;
    const convId = await openOrCreateConversation({
      senderId: firebaseUser.uid,
      senderName: userPrivate.displayName,
      recipientId: asn.workerId,
      recipientName: asn.workerName,
      taskId: asn.taskId,
      taskTitle: asn.taskTitle,
    });
    onOpenChat(convId);
  };

  return (
    <div className="space-y-4">
      {notice && (
        <div className="p-3.5 rounded-[9px] bg-[#eaf8f2] border border-[#bce8d4] text-[13px] font-medium text-[#15966b]">
          {notice}
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-[9px] bg-[#fff0f0] border border-[#f1c7c7] text-[13px] font-medium text-[#d34552]">
          {errorMsg}
        </div>
      )}

      {active.length === 0 ? (
        <div className="swas-card rounded-[13px] p-10 text-center">
          <h3 className="swas-heading-section">No active projects</h3>
          <p className="mt-1.5 swas-desc">
            Accept a bid from a worker to start managing an active project here.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('received-bids')}
            className="mt-4 px-4 py-2 swas-btn-text swas-btn-primary rounded-[9px] cursor-pointer"
          >
            Review Received Bids
          </button>
        </div>
      ) : (
        active.map((asn) => (
          <div key={asn.id} className="swas-card rounded-[13px] p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
              <div>
                <p className="swas-meta">
                  Worker: {asn.workerName} · Deadline {asn.deadline}
                </p>
                <h3 className="swas-heading-section mt-1">{asn.taskTitle}</h3>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-[16px] font-bold text-[#172b46] tabular-nums">
                  {formatKes(asn.agreedKes)}
                </span>
                <span
                  className={`text-[12px] font-semibold capitalize ${
                    asn.status === 'submitted'
                      ? 'text-[#2877d5]'
                      : asn.status === 'revision_requested'
                      ? 'text-[#d99527]'
                      : 'text-[#15966b]'
                  }`}
                >
                  {asn.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {asn.submissionNotes ? (
              <div className="p-4 rounded-[10px] bg-[#f9fbfe] border border-[#dce5f0] space-y-1.5">
                <p className="text-[13px] font-semibold text-[#172b46]">Worker Submission</p>
                <p className="swas-body">{asn.submissionNotes}</p>
                {asn.submissionUrl && (
                  <a
                    href={asn.submissionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[13px] font-semibold swas-link hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Inspect Deliverable Link
                  </a>
                )}
              </div>
            ) : (
              <p className="swas-desc">
                Waiting for {asn.workerName} to submit project deliverables.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleMessageWorker(asn)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 swas-btn-text bg-[#e9f2ff] text-[#1265c8] hover:text-[#0d4fa5] rounded-[9px] hover:bg-[#dcebff] cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Message Worker
              </button>

              {asn.status === 'submitted' && (
                <>
                  <button
                    type="button"
                    disabled={busyId === asn.id}
                    onClick={() => handleApprove(asn)}
                    className="px-4 py-2 swas-btn-text bg-[#15966b] text-white rounded-[9px] hover:brightness-95 disabled:opacity-60 cursor-pointer"
                  >
                    {busyId === asn.id ? 'Approving...' : 'Approve Work'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRevisionId(asn.id);
                      setFeedbackInput('');
                    }}
                    className="px-4 py-2 swas-btn-text bg-[#fff8ec] text-[#d99527] border border-[#f5dca8] rounded-[9px] cursor-pointer"
                  >
                    Request Revision
                  </button>
                </>
              )}
            </div>

            {revisionId === asn.id && (
              <form
                onSubmit={(e) => handleRequestRevision(e, asn)}
                className="pt-3 border-t border-[#e1e8f2] space-y-3"
              >
                <label className="block swas-label">
                  Revision Instructions for {asn.workerName}
                </label>
                <textarea
                  required
                  minLength={5}
                  maxLength={800}
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="Specify what updates or corrections are required..."
                  className="w-full min-h-[84px] px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={busyId === asn.id}
                    className="px-4 py-2 swas-btn-text swas-btn-primary rounded-[9px] cursor-pointer"
                  >
                    Send Revision Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setRevisionId(null)}
                    className="px-4 py-2 swas-btn-text bg-white border border-[#dce5f0] text-[#42556f] rounded-[9px] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function CompletedProjectsView({
  clientAssignments,
  transactions,
  onNavigate,
}: {
  clientAssignments: TaskAssignment[];
  transactions: LedgerTransaction[];
  onNavigate: (route: WorkspaceRoute) => void;
}) {
  const completed = useMemo(
    () => clientAssignments.filter((a) => a.status === 'completed'),
    [clientAssignments]
  );

  return (
    <div className="space-y-4">
      {completed.length === 0 ? (
        <div className="swas-card rounded-[13px] p-10 text-center">
          <h3 className="swas-heading-section">No completed projects yet</h3>
          <p className="mt-1.5 swas-desc">
            Approved assignments and their payment confirmation statuses appear here.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('active-projects')}
            className="mt-4 px-4 py-2 swas-btn-text bg-[#e9f2ff] text-[#1265c8] rounded-[9px] cursor-pointer"
          >
            Check Active Projects
          </button>
        </div>
      ) : (
        completed.map((asn) => {
          const tx = transactions.find((t) => t.assignmentId === asn.id && t.kind === 'payment');
          return (
            <div key={asn.id} className="swas-card rounded-[13px] p-6 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="swas-meta">
                    Worker: {asn.workerName} · Completed Project
                  </p>
                  <h3 className="swas-heading-card text-[#172b46] mt-0.5">{asn.taskTitle}</h3>
                </div>
                <div className="sm:text-right">
                  <span className="block text-[16px] font-bold text-[#172b46] tabular-nums">
                    {formatKes(asn.agreedKes)}
                  </span>
                  <span className="swas-desc">
                    {tx?.status === 'verified_settled'
                      ? `Settled (${tx.reference})`
                      : `Pending Settlement Confirmation (${tx?.reference || 'Ledger'})`}
                  </span>
                </div>
              </div>
              {asn.submissionUrl && (
                <a
                  href={asn.submissionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[13px] font-semibold swas-link hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Final Deliverable Link
                </a>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
