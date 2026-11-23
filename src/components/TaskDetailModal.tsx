import React, { useEffect, useState } from 'react';
import { Bookmark, MessageSquare, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  openOrCreateConversation,
  submitBid,
  toggleSavedTask,
} from '../lib/marketplaceService';
import { formatKes } from '../lib/validation';
import type { MarketplaceTask, PublicRoute, TaskBid, WorkspaceRoute } from '../types/marketplace';

interface TaskDetailModalProps {
  task: MarketplaceTask | null;
  workerBids: TaskBid[];
  isSaved: boolean;
  onClose: () => void;
  onNavigate: (route: PublicRoute | WorkspaceRoute) => void;
  onOpenChat?: (conversationId: string) => void;
}

export function TaskDetailModal({
  task,
  workerBids,
  isSaved,
  onClose,
  onNavigate,
  onOpenChat,
}: TaskDetailModalProps) {
  const { firebaseUser, userPrivate } = useAuth();
  const [amountKes, setAmountKes] = useState(() => (task ? String(task.budgetKes) : '500'));
  const [deliveryDays, setDeliveryDays] = useState('3');
  const [proposal, setProposal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setAmountKes(String(task.budgetKes));
      setDeliveryDays('3');
      setProposal('');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [task?.id]);

  if (!task) return null;

  const isWorker = userPrivate?.role === 'worker';
  const isOwner = firebaseUser?.uid === task.clientId;
  const activeBid = workerBids.find(
    (b) => b.taskId === task.id && (b.status === 'pending' || b.status === 'accepted')
  );
  const canBid = Boolean(firebaseUser && isWorker && !isOwner && !activeBid && task.status === 'open');

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userPrivate) return;
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await submitBid(task, firebaseUser.uid, userPrivate.displayName, workerBids, {
        amountKes: Number(amountKes),
        deliveryDays: Number(deliveryDays),
        proposal,
      });
      setSuccessMsg('Your bid proposal has been submitted to the client.');
      setProposal('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to submit bid.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSave = async () => {
    if (!firebaseUser || !isWorker) return;
    setSavingBookmark(true);
    try {
      await toggleSavedTask(firebaseUser.uid, task, isSaved);
    } finally {
      setSavingBookmark(false);
    }
  };

  const handleMessageClient = async () => {
    if (!firebaseUser || !userPrivate) return;
    const convId = await openOrCreateConversation({
      senderId: firebaseUser.uid,
      senderName: userPrivate.displayName,
      recipientId: task.clientId,
      recipientName: task.clientName,
      taskId: task.id,
      taskTitle: task.title,
    });
    onClose();
    if (onOpenChat) {
      onOpenChat(convId);
    } else {
      onNavigate('messages');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0b203d]/55 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      <div className="bg-white border border-[#e1e8f2] rounded-[14px] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-[0_18px_40px_rgba(16,43,80,0.22)]">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#e1e8f2]">
          <div>
            <p className="swas-meta mb-1.5">
              {task.category} · Client: {task.clientName} · Due {task.deadline}
            </p>
            <h2 id="task-modal-title" className="swas-heading-page">
              {task.title}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isWorker && (
              <button
                type="button"
                disabled={savingBookmark}
                onClick={handleToggleSave}
                aria-label={isSaved ? 'Remove from saved tasks' : 'Save task'}
                className={`p-2 rounded-[9px] border transition cursor-pointer ${
                  isSaved
                    ? 'bg-[#e9f2ff] border-[#1265c8] text-[#1265c8]'
                    : 'border-[#dce5f0] text-[#75869d] hover:text-[#172b46]'
                }`}
              >
                <Bookmark className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close task details"
              className="p-2 rounded-[9px] border border-[#dce5f0] text-[#75869d] hover:text-[#172b46] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 py-4 border-b border-[#e1e8f2]">
          <div>
            <span className="block swas-desc">Client Budget</span>
            <strong className="text-[18px] font-bold text-[#172b46] tabular-nums">
              {formatKes(task.budgetKes)}
            </strong>
          </div>
          <div>
            <span className="block swas-desc">Deadline</span>
            <strong className="text-[15px] font-semibold text-[#172b46] tabular-nums">
              {task.deadline}
            </strong>
          </div>
          <div>
            <span className="block swas-desc">Status</span>
            <strong
              className={`text-[14px] font-semibold capitalize ${
                task.status === 'open' ? 'text-[#15966b]' : 'text-[#75869d]'
              }`}
            >
              {task.status.replace('_', ' ')}
            </strong>
          </div>
        </div>

        <div className="py-5 space-y-5">
          <div>
            <h3 className="swas-heading-card mb-1.5">Task Description</h3>
            <p className="swas-body whitespace-pre-line">{task.description}</p>
          </div>

          {task.skills && task.skills.length > 0 && (
            <div>
              <h3 className="swas-heading-card mb-1">Required Skills</h3>
              <p className="swas-desc">{task.skills.join(' · ')}</p>
            </div>
          )}

          {task.attachmentUrl && (
            <div>
              <h3 className="swas-heading-card mb-1">Supporting Attachment</h3>
              <a
                href={task.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] font-semibold swas-link hover:underline break-all"
              >
                {task.attachmentUrl}
              </a>
            </div>
          )}

          {!firebaseUser && (
            <div className="bg-[#e9f2ff] border border-[#b7cff0] rounded-[10px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-semibold text-[#172b46]">Want to bid on this task?</p>
                <p className="swas-desc text-[#42556f] mt-0.5">
                  Sign in or register as a Worker to submit a KES bid proposal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate('login');
                }}
                className="px-4 py-2 swas-btn-primary swas-btn-text rounded-[9px] whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign In to Bid
              </button>
            </div>
          )}

          {firebaseUser && !isWorker && !isOwner && (
            <div className="bg-[#f3f6fa] border border-[#e1e8f2] rounded-[9px] p-4 swas-desc">
              You are signed in with a Client account. Only Worker accounts can submit bids on marketplace tasks.
            </div>
          )}

          {firebaseUser && isWorker && !isOwner && (
            <div className="flex items-center justify-between bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] px-4 py-3">
              <span className="swas-desc text-[#42556f]">
                Have a question about task requirements before bidding?
              </span>
              <button
                type="button"
                onClick={handleMessageClient}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold swas-link hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Message Client
              </button>
            </div>
          )}

          {activeBid && (
            <div className="bg-[#eaf8f2] border border-[#bce8d4] rounded-[9px] p-4 text-[13px] text-[#15966b]">
              You have an active <strong>{activeBid.status}</strong> bid of{' '}
              <strong className="tabular-nums">{formatKes(activeBid.amountKes)}</strong> on this task. Manage it in <strong>My Bids</strong>.
            </div>
          )}

          {successMsg && (
            <div className="bg-[#eaf8f2] border border-[#bce8d4] rounded-[9px] p-4 text-[13px] text-[#15966b]">
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="bg-[#fff0f0] border border-[#f1c7c7] rounded-[9px] p-4 text-[13px] text-[#d34552]">
              {errorMsg}
            </div>
          )}

          {canBid && !successMsg && (
            <form onSubmit={handleBidSubmit} className="pt-3 border-t border-[#e1e8f2] space-y-4">
              <h3 className="swas-heading-section">Submit Bid Proposal</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bid-amt" className="block swas-label mb-1.5">
                    Your Bid Amount (KES)
                  </label>
                  <input
                    id="bid-amt"
                    type="number"
                    required
                    min={50}
                    max={5000000}
                    value={amountKes}
                    onChange={(e) => setAmountKes(e.target.value)}
                    className="w-full px-3 py-2.5 swas-input tabular-nums bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
                  />
                </div>
                <div>
                  <label htmlFor="bid-days" className="block swas-label mb-1.5">
                    Delivery Timeline (Days)
                  </label>
                  <input
                    id="bid-days"
                    type="number"
                    required
                    min={1}
                    max={365}
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(e.target.value)}
                    className="w-full px-3 py-2.5 swas-input tabular-nums bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bid-prop" className="block swas-label mb-1.5">
                  Proposal & Approach
                </label>
                <textarea
                  id="bid-prop"
                  required
                  minLength={10}
                  maxLength={1500}
                  value={proposal}
                  onChange={(e) => setProposal(e.target.value)}
                  placeholder="Outline your relevant experience, methodology, and deliverable plan..."
                  className="w-full min-h-[100px] px-3 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 swas-btn-text text-[#172b46] bg-white border border-[#dce5f0] rounded-[9px] hover:bg-[#e9f2ff] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 swas-btn-text swas-btn-primary rounded-[9px] disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? 'Submitting...' : 'Submit Bid'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
