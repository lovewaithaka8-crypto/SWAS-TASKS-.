import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Layers,
  Megaphone,
  Paperclip,
  Play,
  Search,
  Send,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  acceptOperationalTask,
  startOperationalAssignment,
  submitOperationalAssignment,
  uploadSubmissionAttachment,
} from '../lib/operationalService';
import { formatCurrency, formatKes } from '../lib/validation';
import {
  OPERATIONAL_TASK_CATEGORIES,
  type Announcement,
  type MarketplaceTask,
  type SubmissionAttachment,
  type TaskCategoryConfig,
  type TaskReservation,
  type TaskSourceType,
  type TaskSubmission,
  type UserPrivate,
  type WalletAccount,
  type WalletLedgerEntry,
  type WorkspaceRoute,
} from '../types/marketplace';

export function AccountStatusBanner({
  userPrivate,
  isSuperAdmin,
}: {
  userPrivate: UserPrivate;
  isSuperAdmin: boolean;
}) {
  if (isSuperAdmin) return null;
  const status = userPrivate.accountStatus;
  if (!status || status === 'ACTIVE') return null;

  const isHardBlocked = status === 'SUSPENDED' || status === 'REJECTED' || status === 'CLOSED';
  const containerTone = isHardBlocked
    ? 'bg-[#fff0f0] border-[#f1c7c7] text-[#8c232d]'
    : 'bg-[#fff8ec] border-[#f5dca8] text-[#7a4f06]';

  const heading =
    status === 'PENDING_ADMIN_APPROVAL'
      ? 'Account Pending Administrator Approval'
      : status === 'EMAIL_VERIFICATION_PENDING' || status === 'REGISTERED'
      ? 'Email Verification Pending'
      : status === 'RESTRICTED'
      ? 'Account Restricted'
      : status === 'SUSPENDED'
      ? 'Account Suspended'
      : status === 'REJECTED'
      ? 'Account Application Rejected'
      : 'Account Closed';

  const description =
    userPrivate.statusReason ||
    (status === 'PENDING_ADMIN_APPROVAL'
      ? 'Your registration and verified email have been received. Task claiming, submissions, earnings, and withdrawals remain locked until an administrator approves your account.'
      : 'Your account is currently not ACTIVE. Contact swastaskorg@gmail.com for assistance.');

  return (
    <div
      role="status"
      className={`rounded-[12px] border px-4 py-3.5 flex items-start gap-3 ${containerTone}`}
    >
      {isHardBlocked ? (
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-[#d34552]" />
      ) : (
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[#d99527]" />
      )}
      <div className="min-w-0 space-y-0.5">
        <p className="text-[13px] font-semibold">
          {heading} · Status: {status.replace(/_/g, ' ')}
        </p>
        <p className="text-[12px] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function formatCountdownMs(deadlineMs: number | undefined, nowMs: number): string {
  if (!deadlineMs || deadlineMs <= 0) return '--:--';
  const diff = Math.max(0, deadlineMs - nowMs);
  if (diff === 0) return '00:00 (Due for sweep)';
  const totalSec = Math.floor(diff / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(mins)}:${pad(secs)}`;
}

function formatSourceLabel(sourceType?: TaskSourceType, sourceName?: string): string {
  if (sourceType === 'GWENO_HUB') return `GWENO HUB · gweno.business`;
  if (sourceType === 'AUTHORIZED_PARTNER') return sourceName || 'Authorized Partner';
  return 'SWAS Original';
}

interface OperationalTasksViewProps {
  headerSearch: string;
  publicTasks: MarketplaceTask[];
  taskCategories: TaskCategoryConfig[];
  userSubmissions: TaskSubmission[];
  userReservations: TaskReservation[];
  wallet: WalletAccount | null;
  walletLedger: WalletLedgerEntry[];
  onNavigate: (route: WorkspaceRoute) => void;
}

export function OperationalTasksView({
  headerSearch,
  publicTasks,
  taskCategories,
  userSubmissions,
  userReservations,
  wallet,
  walletLedger,
  onNavigate,
}: OperationalTasksViewProps) {
  const { firebaseUser, userPrivate, isSuperAdmin } = useAuth();
  const [sourceFilter, setSourceFilter] = useState<'ALL' | TaskSourceType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [inspectedTask, setInspectedTask] = useState<MarketplaceTask | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [busySubId, setBusySubId] = useState<string | null>(null);
  const [uploadingSubId, setUploadingSubId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Per-submission draft fields
  const [notesBySub, setNotesBySub] = useState<Record<string, string>>({});
  const [urlBySub, setUrlBySub] = useState<Record<string, string>>({});
  const [declaredBySub, setDeclaredBySub] = useState<Record<string, boolean>>({});
  const [attachmentsBySub, setAttachmentsBySub] = useState<
    Record<string, SubmissionAttachment[]>
  >({});

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isAccountActive =
    isSuperAdmin || !userPrivate?.accountStatus || userPrivate.accountStatus === 'ACTIVE';

  const availableCategoryNames = useMemo(() => {
    const names = new Set<string>();
    taskCategories.forEach((c) => {
      if (c.enabled) names.add(c.name);
    });
    if (names.size === 0) {
      OPERATIONAL_TASK_CATEGORIES.forEach((c) => names.add(c));
    }
    return Array.from(names);
  }, [taskCategories]);

  // Show dual-source operational tasks (direct_claim or imported external source)
  const operationalTasks = useMemo(() => {
    const q = (search || headerSearch).trim().toLowerCase();
    return publicTasks.filter((t) => {
      const isOperational =
        t.executionMode === 'direct_claim' ||
        t.sourceType === 'GWENO_HUB' ||
        t.sourceType === 'AUTHORIZED_PARTNER' ||
        t.sourceType === 'SWAS_ORIGINAL';
      if (!isOperational) return false;
      if (t.status !== 'open' && t.lifecycleStatus !== 'PUBLISHED') return false;
      if (sourceFilter !== 'ALL' && (t.sourceType || 'SWAS_ORIGINAL') !== sourceFilter) {
        return false;
      }
      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) {
        return false;
      }
      if (q) {
        const hay = `${t.title} ${t.description} ${t.category} ${t.sourceName || ''} ${t.sourceTaskId || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [publicTasks, search, headerSearch, sourceFilter, categoryFilter]);

  const submissionByTaskId = useMemo(() => {
    const map = new Map<string, TaskSubmission>();
    userSubmissions.forEach((s) => {
      if (s.status !== 'EXPIRED' && s.status !== 'REJECTED') {
        map.set(s.taskId, s);
      }
    });
    return map;
  }, [userSubmissions]);

  const reservationBySubId = useMemo(() => {
    const map = new Map<string, TaskReservation>();
    userReservations.forEach((r) => {
      if (r.submissionId) map.set(r.submissionId, r);
    });
    return map;
  }, [userReservations]);

  const handleAcceptTask = async (task: MarketplaceTask) => {
    if (!firebaseUser) return;
    if (!isAccountActive) {
      setFeedback({
        ok: false,
        text: `Your account (${userPrivate?.accountStatus}) must be ACTIVE before claiming tasks.`,
      });
      return;
    }
    setBusyTaskId(task.id);
    setFeedback(null);
    try {
      const res = await acceptOperationalTask(firebaseUser, task.id);
      setFeedback({
        ok: true,
        text: `Task slot reserved (${res.reservationId}). Start and submit your deliverable below.`,
      });
      setInspectedTask(null);
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to claim task slot.',
      });
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleStartTask = async (sub: TaskSubmission) => {
    if (!firebaseUser) return;
    setBusySubId(sub.id);
    setFeedback(null);
    try {
      await startOperationalAssignment(firebaseUser, sub.id);
      setFeedback({
        ok: true,
        text: `Task "${sub.taskTitle}" marked In Progress.`,
      });
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to start task.',
      });
    } finally {
      setBusySubId(null);
    }
  };

  const handleUploadFile = async (sub: TaskSubmission, file: File | null) => {
    if (!firebaseUser || !file) return;
    setUploadingSubId(sub.id);
    setFeedback(null);
    try {
      const uploaded = await uploadSubmissionAttachment(firebaseUser.uid, sub.id, file);
      const nextAtt: SubmissionAttachment = {
        id: `att_${Date.now().toString(36)}`,
        submissionId: sub.id,
        userId: firebaseUser.uid,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        storagePath: uploaded.storagePath,
        downloadUrl: uploaded.downloadUrl,
        uploadedAtMs: Date.now(),
      };
      setAttachmentsBySub((prev) => ({
        ...prev,
        [sub.id]: [...(prev[sub.id] || sub.attachments || []), nextAtt],
      }));
      setFeedback({
        ok: true,
        text: `Uploaded ${uploaded.fileName} to Firebase Storage.`,
      });
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'File upload failed.',
      });
    } finally {
      setUploadingSubId(null);
    }
  };

  const handleSubmitWork = async (e: React.FormEvent, sub: TaskSubmission) => {
    e.preventDefault();
    if (!firebaseUser) return;
    const notes = (notesBySub[sub.id] ?? sub.notes ?? '').trim();
    const deliverableUrl = (urlBySub[sub.id] ?? sub.deliverableUrl ?? '').trim();
    const declared = Boolean(declaredBySub[sub.id]);
    const atts = attachmentsBySub[sub.id] ?? sub.attachments ?? [];

    if (!declared) {
      setFeedback({
        ok: false,
        text: 'Confirm the completion declaration checkbox before submitting.',
      });
      return;
    }

    setBusySubId(sub.id);
    setFeedback(null);
    try {
      const res = await submitOperationalAssignment(firebaseUser, sub.id, {
        notes,
        deliverableUrl: deliverableUrl || undefined,
        completionDeclared: true,
        attachments: atts.map((a) => ({
          fileName: a.fileName,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
          storagePath: a.storagePath,
          downloadUrl: a.downloadUrl,
        })),
      });
      setFeedback({
        ok: true,
        text: `Submission received and entered 90-minute review window (Deadline: ${new Date(
          res.reviewDeadlineAtMs
        ).toLocaleTimeString('en-KE')}).`,
      });
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'Submission failed.',
      });
    } finally {
      setBusySubId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Wallet Snapshot */}
      <div className="swas-card rounded-[14px] p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium text-[#1265c8]">
            Dual-Source Operations · SWAS Original &amp; GWENO HUB
          </p>
          <h2 className="swas-heading-main mt-0.5">Operational Task Centre</h2>
          <p className="swas-body mt-1 max-w-2xl">
            Claim direct-execution SWAS TASKS assignments and authorized GWENO HUB tasks, upload deliverables, and track your live 90-minute review countdowns.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 shrink-0 text-right">
          <div className="px-4 py-2.5 rounded-[10px] bg-[#f8fbff] border border-[#dce5f0]">
            <span className="block text-[11px] font-medium text-[#75869d]">Available</span>
            <span className="text-[15px] font-bold text-[#15966b] tabular-nums">
              {formatKes(wallet?.availableBalance ?? wallet?.availableKes ?? 0)}
            </span>
          </div>
          <div className="px-4 py-2.5 rounded-[10px] bg-[#f8fbff] border border-[#dce5f0]">
            <span className="block text-[11px] font-medium text-[#75869d]">Pending Review</span>
            <span className="text-[15px] font-bold text-[#d99527] tabular-nums">
              {formatKes(wallet?.pendingEarnings ?? 0)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('wallet')}
            className="px-4 py-2.5 rounded-[10px] bg-[#102b50] text-white text-left hover:bg-[#1265c8] transition-colors cursor-pointer"
          >
            <span className="block text-[11px] text-[#c8dcf5]">Reserved Payouts</span>
            <span className="text-[15px] font-bold tabular-nums">
              {formatKes(wallet?.reservedWithdrawalFunds ?? 0)}
            </span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-[10px] border text-[13px] flex items-center justify-between gap-3 ${
            feedback.ok
              ? 'bg-[#eaf8f2] border-[#bce8d4] text-[#15966b]'
              : 'bg-[#fff0f0] border-[#f1c7c7] text-[#d34552]'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[12px] font-semibold underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Source + Category Filters */}
      <div className="swas-card rounded-[14px] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#f3f6fa] rounded-[10px]">
            {(
              [
                { id: 'ALL', label: 'All Sources' },
                { id: 'SWAS_ORIGINAL', label: 'SWAS Original' },
                { id: 'GWENO_HUB', label: 'GWENO HUB' },
                { id: 'AUTHORIZED_PARTNER', label: 'Authorized Partners' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSourceFilter(tab.id)}
                className={`px-3 py-1.5 text-[12px] font-semibold rounded-[8px] whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  sourceFilter === tab.id
                    ? 'bg-white text-[#102b50] shadow-sm'
                    : 'text-[#5b6d85] hover:text-[#172b46]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-1 justify-end min-w-[260px]">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#75869d] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, source ID, category..."
                className="w-full pl-9 pr-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>

            <select
              aria-label="Filter by operational category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            >
              <option value="ALL">All Categories ({availableCategoryNames.length})</option>
              {availableCategoryNames.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Available Operational Tasks Grid */}
        {operationalTasks.length === 0 ? (
          <div className="py-10 text-center space-y-2 border-t border-[#e1e8f2]">
            <Layers className="w-7 h-7 text-[#9aa9bb] mx-auto" />
            <h3 className="swas-heading-card">No published operational tasks match your filter</h3>
            <p className="swas-desc max-w-md mx-auto">
              Tasks published from SWAS Operations or authorized GWENO HUB imports appear here immediately once published.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('browse-tasks')}
              className="mt-2 inline-flex items-center px-4 py-2 rounded-[9px] bg-[#e9f2ff] text-[#1265c8] text-[13px] font-semibold hover:bg-[#dcebff] cursor-pointer"
            >
              View Client Bid Marketplace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2 border-t border-[#e1e8f2]">
            {operationalTasks.map((task) => {
              const existingSub = submissionByTaskId.get(task.id);
              const slotsLeft = task.availableSlots ?? task.maxSlots ?? 1;
              const maxSlots = task.maxSlots ?? 1;
              return (
                <div
                  key={task.id}
                  className="rounded-[12px] border border-[#dce5f0] bg-[#fcfdff] p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-[#5b6d85]">
                      <span className="text-[#1265c8] font-semibold">
                        {formatSourceLabel(task.sourceType, task.sourceName)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{task.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {slotsLeft}/{maxSlots} slots
                      </span>
                    </div>

                    <h3 className="text-[15px] font-bold text-[#172b46] leading-snug">
                      {task.title}
                    </h3>

                    <p className="text-[13px] text-[#42556f] line-clamp-3 leading-relaxed">
                      {task.description}
                    </p>

                    {task.sourceAttribution && (
                      <p className="text-[11px] text-[#75869d] leading-snug">
                        {task.sourceAttribution}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#e1e8f2] space-y-3">
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <div>
                        <span className="block text-[16px] font-bold text-[#172b46] tabular-nums">
                          {formatKes(task.budgetKes)}
                        </span>
                        <span className="text-[11px] text-[#75869d] tabular-nums">
                          {task.reviewWindowMinutes || 90} min review · Due {task.deadline}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setInspectedTask(task)}
                          className="px-3 py-1.5 rounded-[8px] bg-[#f3f6fa] text-[#172b46] text-[12px] font-semibold hover:bg-[#e9f2ff] whitespace-nowrap cursor-pointer"
                        >
                          VIEW TASK
                        </button>
                        {existingSub ? (
                          <span className="text-[11px] font-semibold text-[#15966b] whitespace-nowrap">
                            {existingSub.status.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!isAccountActive || busyTaskId === task.id || slotsLeft <= 0}
                            onClick={() => void handleAcceptTask(task)}
                            className="px-3 py-1.5 rounded-[8px] swas-btn-primary text-[12px] whitespace-nowrap disabled:opacity-50 cursor-pointer"
                          >
                            {busyTaskId === task.id ? 'Claiming...' : 'ACCEPT TASK'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Inspection Modal */}
      {inspectedTask && (
        <div
          className="fixed inset-0 z-50 bg-[#0b203d]/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-[14px] border border-[#dce5f0] max-w-2xl w-full p-6 space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold text-[#1265c8]">
                  {formatSourceLabel(inspectedTask.sourceType, inspectedTask.sourceName)} ·{' '}
                  {inspectedTask.category}
                </p>
                <h3 className="swas-heading-page mt-1">{inspectedTask.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedTask(null)}
                className="px-3 py-1.5 rounded-[8px] bg-[#f3f6fa] text-[#42556f] text-[12px] font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-[10px] bg-[#f8fbff] border border-[#dce5f0] text-[12px]">
              <div>
                <span className="block text-[#75869d]">SWAS Reward</span>
                <strong className="text-[#172b46] tabular-nums">
                  {formatKes(inspectedTask.budgetKes)}
                </strong>
              </div>
              <div>
                <span className="block text-[#75869d]">Available Slots</span>
                <strong className="text-[#172b46] tabular-nums">
                  {inspectedTask.availableSlots ?? inspectedTask.maxSlots ?? 1} /{' '}
                  {inspectedTask.maxSlots ?? 1}
                </strong>
              </div>
              <div>
                <span className="block text-[#75869d]">Review Window</span>
                <strong className="text-[#172b46] tabular-nums">
                  {inspectedTask.reviewWindowMinutes || 90} minutes
                </strong>
              </div>
              <div>
                <span className="block text-[#75869d]">Deadline</span>
                <strong className="text-[#172b46] tabular-nums">{inspectedTask.deadline}</strong>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="swas-label">Instructions &amp; Deliverables</h4>
              <p className="swas-body whitespace-pre-wrap">
                {inspectedTask.instructions || inspectedTask.description}
              </p>
              {inspectedTask.requiredDeliverables &&
                inspectedTask.requiredDeliverables.length > 0 && (
                  <ul className="list-disc pl-5 text-[13px] text-[#42556f] space-y-1">
                    {inspectedTask.requiredDeliverables.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
            </div>

            {inspectedTask.sourceAttribution && (
              <div className="p-3 rounded-[9px] bg-[#f9fbfe] border border-[#dce5f0] text-[12px] text-[#42556f]">
                <strong>Source Attribution:</strong> {inspectedTask.sourceAttribution}
                {inspectedTask.sourceRewardOriginal !== undefined && (
                  <span className="block mt-0.5 tabular-nums text-[#75869d]">
                    Original source reward: {inspectedTask.sourceCurrency || 'KES'}{' '}
                    {inspectedTask.sourceRewardOriginal} · SWAS verified payout:{' '}
                    {formatKes(inspectedTask.budgetKes)}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#e1e8f2]">
              <button
                type="button"
                onClick={() => setInspectedTask(null)}
                className="px-4 py-2 rounded-[9px] bg-[#f3f6fa] text-[#42556f] text-[13px] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              {!submissionByTaskId.has(inspectedTask.id) && (
                <button
                  type="button"
                  disabled={!isAccountActive || busyTaskId === inspectedTask.id}
                  onClick={() => void handleAcceptTask(inspectedTask)}
                  className="px-5 py-2 rounded-[9px] swas-btn-primary text-[13px] disabled:opacity-50 cursor-pointer"
                >
                  {busyTaskId === inspectedTask.id ? 'Reserving Slot...' : 'ACCEPT TASK'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* My Active & Past Operational Submissions */}
      <div className="swas-card rounded-[14px] p-6 space-y-4">
        <div>
          <h3 className="swas-heading-section">My Task Reservations &amp; 90-Minute Review Queue</h3>
          <p className="swas-desc mt-0.5">
            Track claimed assignments, upload verification documents (PDF, DOC, DOCX, PNG, JPG, WEBP up to 10 MB), respond to correction requests, and watch live 90-minute approval timers.
          </p>
        </div>

        {userSubmissions.length === 0 ? (
          <p className="swas-body text-[#75869d] py-6 text-center">
            You have not accepted any operational tasks yet. Click ACCEPT TASK on an open task above to begin.
          </p>
        ) : (
          <div className="space-y-4">
            {userSubmissions.map((sub) => {
              const reservation = reservationBySubId.get(sub.id);
              const canStart = sub.status === 'RESERVED';
              const canSubmit =
                sub.status === 'IN_PROGRESS' || sub.status === 'CORRECTION_REQUESTED';
              const inReview =
                sub.status === 'UNDER_REVIEW' ||
                sub.status === 'SUBMITTED' ||
                sub.status === 'RESUBMITTED' ||
                sub.status === 'ON_HOLD';
              const isApproved =
                sub.status === 'APPROVED' || sub.status === 'AUTO_APPROVED';
              const currentAttachments = attachmentsBySub[sub.id] ?? sub.attachments ?? [];

              return (
                <div
                  key={sub.id}
                  className="rounded-[12px] border border-[#dce5f0] bg-[#fcfdff] p-5 space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#75869d]">
                        <span className="font-semibold text-[#1265c8]">
                          {formatSourceLabel(sub.sourceType, sub.sourceName)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{sub.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">Attempt v{sub.version}</span>
                      </div>
                      <h4 className="text-[15px] font-bold text-[#172b46] mt-0.5">
                        {sub.taskTitle}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 shrink-0">
                      <span className="text-[16px] font-bold text-[#172b46] tabular-nums">
                        {formatKes(sub.rewardKes)}
                      </span>
                      <span
                        className={`text-[12px] font-bold uppercase ${
                          isApproved
                            ? 'text-[#15966b]'
                            : sub.status === 'REJECTED'
                            ? 'text-[#d34552]'
                            : sub.status === 'CORRECTION_REQUESTED' || sub.onHold
                            ? 'text-[#d99527]'
                            : 'text-[#1265c8]'
                        }`}
                      >
                        {sub.onHold ? 'ON HOLD (TIMER PAUSED)' : sub.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Live 90-Minute Countdown */}
                  {inReview && sub.reviewDeadlineAtMs && (
                    <div className="p-3.5 rounded-[9px] bg-[#f8fbff] border border-[#dce5f0] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[13px] text-[#172b46]">
                        <Clock className="w-4 h-4 text-[#1265c8]" />
                        <span>
                          {sub.onHold
                            ? 'Administrator Hold Active — Auto-approval countdown paused.'
                            : '90-Minute Review Engine Active — Eligible for automatic approval if unreviewed:'}
                        </span>
                      </div>
                      <span className="font-mono text-[15px] font-bold text-[#102b50] tabular-nums">
                        {sub.onHold
                          ? 'PAUSED'
                          : formatCountdownMs(sub.reviewDeadlineAtMs, nowMs)}
                      </span>
                    </div>
                  )}

                  {sub.correctionReason && sub.status === 'CORRECTION_REQUESTED' && (
                    <div className="p-3.5 rounded-[9px] bg-[#fff8ec] border border-[#f5dca8] text-[13px] text-[#7a4f06]">
                      <strong>Administrator Correction Request:</strong> {sub.correctionReason}
                    </div>
                  )}

                  {sub.holdReason && sub.onHold && (
                    <div className="p-3.5 rounded-[9px] bg-[#fff8ec] border border-[#f5dca8] text-[13px] text-[#7a4f06]">
                      <strong>Compliance Hold Note:</strong> {sub.holdReason}
                    </div>
                  )}

                  {sub.rejectionReason && sub.status === 'REJECTED' && (
                    <div className="p-3.5 rounded-[9px] bg-[#fff0f0] border border-[#f1c7c7] text-[13px] text-[#8c232d]">
                      <strong>Rejection Reason:</strong> {sub.rejectionReason}
                    </div>
                  )}

                  {isApproved && sub.decisionReason && (
                    <div className="p-3.5 rounded-[9px] bg-[#eaf8f2] border border-[#bce8d4] text-[13px] text-[#15966b] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        <strong>{sub.status.replace(/_/g, ' ')}:</strong> {sub.decisionReason}
                      </span>
                    </div>
                  )}

                  {canStart && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <p className="text-[12px] text-[#5b6d85] tabular-nums">
                        Slot reserved.{' '}
                        {reservation?.expiresAtMs
                          ? `Reservation expires ${new Date(
                              reservation.expiresAtMs
                            ).toLocaleString('en-KE')}.`
                          : ''}
                      </p>
                      <button
                        type="button"
                        disabled={busySubId === sub.id}
                        onClick={() => void handleStartTask(sub)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] swas-btn-primary text-[13px] disabled:opacity-50 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        {busySubId === sub.id ? 'Starting...' : 'START TASK'}
                      </button>
                    </div>
                  )}

                  {canSubmit && (
                    <form
                      onSubmit={(e) => void handleSubmitWork(e, sub)}
                      className="pt-3 border-t border-[#e1e8f2] space-y-3"
                    >
                      <div>
                        <label className="block swas-label mb-1">
                          Work Summary &amp; Verification Details
                        </label>
                        <textarea
                          required
                          minLength={5}
                          maxLength={2000}
                          value={notesBySub[sub.id] ?? sub.notes ?? ''}
                          onChange={(e) =>
                            setNotesBySub((prev) => ({ ...prev, [sub.id]: e.target.value }))
                          }
                          placeholder="Describe completed work, deliverables, and verification details..."
                          className="w-full min-h-[92px] px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block swas-label mb-1">
                            Deliverable URL (Optional)
                          </label>
                          <input
                            type="url"
                            maxLength={400}
                            value={urlBySub[sub.id] ?? sub.deliverableUrl ?? ''}
                            onChange={(e) =>
                              setUrlBySub((prev) => ({ ...prev, [sub.id]: e.target.value }))
                            }
                            placeholder="https://..."
                            className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                          />
                        </div>

                        <div>
                          <label className="block swas-label mb-1">
                            Upload Proof File (PDF, DOC, DOCX, PNG, JPG, WEBP · Max 10 MB)
                          </label>
                          <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[9px] bg-[#f3f6fa] border border-[#d7e2ef] text-[13px] font-medium text-[#172b46] hover:bg-[#e9f2ff] cursor-pointer">
                            <Upload className="w-4 h-4 text-[#1265c8]" />
                            <span>
                              {uploadingSubId === sub.id ? 'Uploading...' : 'Attach Deliverable File'}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                              disabled={uploadingSubId === sub.id}
                              onChange={(e) =>
                                void handleUploadFile(sub, e.target.files?.[0] || null)
                              }
                              className="sr-only"
                            />
                          </label>
                        </div>
                      </div>

                      {currentAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {currentAttachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-[#e9f2ff] text-[#1265c8] text-[12px] font-medium hover:underline"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              {att.fileName}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      )}

                      <label className="flex items-start gap-2.5 text-[12px] text-[#2a3f5d] p-3 rounded-[9px] bg-[#f8fbff] border border-[#d7e2ef] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(declaredBySub[sub.id])}
                          onChange={(e) =>
                            setDeclaredBySub((prev) => ({
                              ...prev,
                              [sub.id]: e.target.checked,
                            }))
                          }
                          className="mt-0.5 w-4 h-4 accent-[#1265c8]"
                        />
                        <span>
                          I declare that this task work is original, accurately completed according to instructions, and complies with SWAS TASKS Task Submission &amp; Quality Standards.
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={busySubId === sub.id || uploadingSubId === sub.id}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[9px] swas-btn-primary text-[13px] disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        {busySubId === sub.id
                          ? 'Submitting...'
                          : sub.status === 'CORRECTION_REQUESTED'
                          ? 'RESUBMIT TASK (90-MIN REVIEW)'
                          : 'SUBMIT TASK'}
                      </button>
                    </form>
                  )}

                  {!canSubmit && sub.notes && (
                    <div className="text-[13px] text-[#42556f] pt-2 border-t border-[#e1e8f2] space-y-1">
                      <p className="font-semibold text-[#172b46]">Submitted Summary</p>
                      <p>{sub.notes}</p>
                      {sub.deliverableUrl && (
                        <a
                          href={sub.deliverableUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#1265c8] font-medium hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View Deliverable Link
                        </a>
                      )}
                      {currentAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {currentAttachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[12px] text-[#1265c8] hover:underline"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              {att.fileName}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Immutable Wallet Ledger History */}
      <div className="swas-card rounded-[14px] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="swas-heading-section">Wallet Ledger Audit Entries</h3>
            <p className="swas-desc mt-0.5">
              Immutable backend credit, reservation, payout, and release records for your account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('withdrawals')}
            className="px-3.5 py-2 rounded-[9px] bg-[#e9f2ff] text-[#1265c8] text-[12px] font-semibold hover:bg-[#dcebff] cursor-pointer"
          >
            Withdraw Funds
          </button>
        </div>

        {walletLedger.length === 0 ? (
          <p className="swas-body text-[#75869d]">
            No wallet ledger entries yet. Approved task earnings and withdrawal reservations appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse swas-table min-w-[680px]">
              <thead>
                <tr className="border-b border-[#e1e8f2] text-[#75869d]">
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 pr-3 font-semibold">Type</th>
                  <th className="py-2 pr-3 font-semibold">Amount</th>
                  <th className="py-2 pr-3 font-semibold">Available Before / After</th>
                  <th className="py-2 font-semibold">Reference &amp; Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1e8f2]">
                {walletLedger.slice(0, 25).map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-2.5 pr-3 text-[#75869d] tabular-nums whitespace-nowrap">
                      {new Date(entry.createdAtMs).toLocaleString('en-KE')}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-[#172b46] whitespace-nowrap">
                      {entry.type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 pr-3 font-bold text-[#172b46] tabular-nums whitespace-nowrap">
                      {formatCurrency(entry.amount, entry.currency || 'KES')}
                    </td>
                    <td className="py-2.5 pr-3 text-[#42556f] tabular-nums whitespace-nowrap">
                      {entry.balanceBefore} → {entry.balanceAfter}
                    </td>
                    <td className="py-2.5 text-[#42556f]">
                      <span className="font-medium text-[#172b46]">{entry.referenceId}</span> ·{' '}
                      {entry.note}
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

export function AnnouncementsView({
  announcements,
  userRole,
}: {
  announcements: Announcement[];
  userRole: 'worker' | 'client';
}) {
  const visible = useMemo(
    () =>
      announcements.filter(
        (a) =>
          a.published &&
          (a.audience === 'all' ||
            (userRole === 'worker' && a.audience === 'workers') ||
            (userRole === 'client' && a.audience === 'clients'))
      ),
    [announcements, userRole]
  );

  return (
    <div className="space-y-5">
      <div className="swas-card rounded-[14px] p-6">
        <div className="flex items-center gap-2 text-[#1265c8]">
          <Megaphone className="w-5 h-5" />
          <span className="text-[12px] font-semibold uppercase tracking-wide">
            Official Bulletins
          </span>
        </div>
        <h2 className="swas-heading-main mt-1">Platform Announcements</h2>
        <p className="swas-body mt-1">
          Operational notices, maintenance updates, and policy reminders issued by SWAS TASKS administration.
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="swas-card rounded-[14px] p-10 text-center space-y-2">
          <Megaphone className="w-7 h-7 text-[#9aa9bb] mx-auto" />
          <h3 className="swas-heading-card">No announcements published right now</h3>
          <p className="swas-desc">
            Check back here for scheduled operational updates and policy notices.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((item) => (
            <article key={item.id} className="swas-card rounded-[14px] p-6 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                <span
                  className={`font-bold uppercase ${
                    item.priority === 'critical'
                      ? 'text-[#d34552]'
                      : item.priority === 'important'
                      ? 'text-[#d99527]'
                      : 'text-[#1265c8]'
                  }`}
                >
                  {item.priority} · Audience: {item.audience}
                </span>
                <span className="text-[#75869d] tabular-nums">
                  {new Date(item.updatedAtMs || item.createdAtMs).toLocaleString('en-KE')}
                </span>
              </div>
              <h3 className="swas-heading-section">{item.title}</h3>
              <p className="swas-body whitespace-pre-wrap">{item.body}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
