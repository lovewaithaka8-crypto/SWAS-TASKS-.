import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CheckCheck,
  ExternalLink,
  HelpCircle,
  KeyRound,
  LogOut,
  MessageSquare,
  Send,
  ShieldCheck,
  UserCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { OFFICIAL_EMAIL_IDENTITY } from '../lib/emailConfig';
import { dispatchPlatformEmail } from '../lib/emailService';
import {
  createSupportTicket,
  markAllNotificationsRead,
  markConversationRead,
  markNotificationRead,
  sendChatMessage,
  subscribeMessages,
  updateUserAccountSettings,
} from '../lib/marketplaceService';
import { parseSkillsInput, SCHEMA_LIMITS } from '../lib/validation';
import type {
  AppNotification,
  ChatMessage,
  Conversation,
  FinancialPlatformConfig,
  LedgerTransaction,
  PayoutAccount,
  PolicyAcceptanceRecord,
  PolicyDocument,
  SupportCategory,
  SupportTicket,
  WalletAccount,
  WithdrawalRequest,
  WorkspaceRoute,
} from '../types/marketplace';
import { FinancialCentrePages } from './FinancialCentrePages';

interface SharedWorkspacePagesProps {
  route: WorkspaceRoute;
  wallet: WalletAccount | null;
  transactions: LedgerTransaction[];
  withdrawals: WithdrawalRequest[];
  payoutAccounts: PayoutAccount[];
  financialConfig: FinancialPlatformConfig;
  policies: PolicyDocument[];
  userAcceptances: PolicyAcceptanceRecord[];
  onOpenPublicPolicy: (slug?: string | null) => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
  notifications: AppNotification[];
  supportTickets: SupportTicket[];
  onNavigate: (route: WorkspaceRoute) => void;
  onSignOut: () => void;
}

export function SharedWorkspacePages({
  route,
  wallet,
  transactions,
  withdrawals,
  payoutAccounts,
  financialConfig,
  policies,
  userAcceptances,
  onOpenPublicPolicy,
  conversations,
  activeConversationId,
  onSelectConversation,
  notifications,
  supportTickets,
  onNavigate,
  onSignOut,
}: SharedWorkspacePagesProps) {
  if (
    route === 'wallet' ||
    route === 'payout-accounts' ||
    route === 'transactions' ||
    route === 'withdrawals' ||
    route === 'payment-history'
  ) {
    return (
      <FinancialCentrePages
        route={route}
        wallet={wallet}
        transactions={transactions}
        withdrawals={withdrawals}
        payoutAccounts={payoutAccounts}
        financialConfig={financialConfig}
        policies={policies}
        userAcceptances={userAcceptances}
        onOpenPublicPolicy={onOpenPublicPolicy}
        onNavigate={onNavigate}
      />
    );
  }
  if (route === 'messages') {
    return (
      <MessagesView
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={onSelectConversation}
      />
    );
  }
  if (route === 'notifications') {
    return <NotificationsView notifications={notifications} onNavigate={onNavigate} />;
  }
  if (route === 'support') {
    return <SupportView supportTickets={supportTickets} onOpenPublicPolicy={onOpenPublicPolicy} />;
  }
  if (route === 'profile' || route === 'settings' || route === 'security') {
    return (
      <AccountPages
        route={route}
        onNavigate={onNavigate}
        onOpenPublicPolicy={onOpenPublicPolicy}
        onSignOut={onSignOut}
      />
    );
  }
  return null;
}

function MessagesView({
  conversations,
  activeConversationId,
  onSelectConversation,
}: {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
}) {
  const { firebaseUser, userPrivate } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const selectedConv = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || conversations[0] || null,
    [conversations, activeConversationId]
  );

  useEffect(() => {
    if (!selectedConv || !firebaseUser) {
      setMessages([]);
      return;
    }
    if (selectedConv.unreadBy.includes(firebaseUser.uid)) {
      void markConversationRead(selectedConv, firebaseUser.uid);
    }
    const unsub = subscribeMessages(selectedConv.id, firebaseUser.uid, (items) => {
      setMessages(items);
    });
    return () => unsub();
  }, [selectedConv?.id, firebaseUser?.uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || !firebaseUser || !userPrivate) return;
    setSending(true);
    setErrorMsg(null);
    try {
      await sendChatMessage({
        conversation: selectedConv,
        senderId: firebaseUser.uid,
        senderName: userPrivate.displayName,
        text,
        attachmentUrl,
      });
      setText('');
      setAttachmentUrl('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="swas-card rounded-[13px] p-12 text-center">
        <MessageSquare className="w-8 h-8 text-[#1265c8] mx-auto mb-3" />
        <h3 className="swas-heading-section">No conversations yet</h3>
        <p className="mt-1.5 swas-body text-[#75869d] max-w-md mx-auto">
          Open a task brief, bid, or active assignment and click Message Client or Message Worker to start a direct thread.
        </p>
      </div>
    );
  }

  const getOtherName = (conv: Conversation) => {
    const otherId = conv.participants.find((id) => id !== firebaseUser?.uid) || '';
    return conv.participantNames?.[otherId] || 'Workspace Member';
  };

  return (
    <div className="swas-card rounded-[14px] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[540px]">
      <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#e1e8f2] divide-y divide-[#e1e8f2] max-h-[540px] overflow-y-auto">
        {conversations.map((conv) => {
          const isSelected = selectedConv?.id === conv.id;
          const hasUnread = firebaseUser ? conv.unreadBy.includes(firebaseUser.uid) : false;
          return (
            <button
              key={conv.id}
              type="button"
              onClick={() => onSelectConversation(conv.id)}
              className={`w-full text-left p-4 transition cursor-pointer ${
                isSelected ? 'bg-[#e9f2ff]' : 'hover:bg-[#f9fbfe]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-semibold text-[#172b46] truncate">
                  {getOtherName(conv)}
                </span>
                {hasUnread && (
                  <span className="text-[11px] font-semibold text-[#1265c8] shrink-0">Unread</span>
                )}
              </div>
              {conv.taskTitle && (
                <p className="text-[12px] font-medium text-[#1265c8] truncate mt-0.5">
                  {conv.taskTitle}
                </p>
              )}
              <p className="swas-desc truncate mt-1">{conv.lastMessage}</p>
            </button>
          );
        })}
      </div>

      <div className="lg:col-span-8 flex flex-col justify-between bg-[#f9fbfe] min-h-[420px]">
        {selectedConv && (
          <>
            <div className="px-5 py-4 bg-white border-b border-[#e1e8f2]">
              <h3 className="swas-heading-card text-[#172b46]">{getOtherName(selectedConv)}</h3>
              {selectedConv.taskTitle && (
                <p className="swas-desc mt-0.5">Task: {selectedConv.taskTitle}</p>
              )}
            </div>

            <div className="flex-1 p-5 space-y-3 overflow-y-auto max-h-[380px]">
              {messages.length === 0 ? (
                <p className="swas-desc text-center py-8">
                  Send the first message in this thread below.
                </p>
              ) : (
                messages.map((m) => {
                  const mine = m.senderId === firebaseUser?.uid;
                  return (
                    <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[82%] rounded-[12px] px-4 py-2.5 text-[14px] leading-relaxed ${
                          mine
                            ? 'bg-[#1265c8] text-white'
                            : 'bg-white border border-[#dce5f0] text-[#42556f]'
                        }`}
                      >
                        <p className="whitespace-pre-line">{m.text}</p>
                        {m.attachmentUrl && (
                          <a
                            href={m.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={`mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold underline ${
                              mine ? 'text-[#e9f2ff]' : 'text-[#1265c8]'
                            }`}
                          >
                            <ExternalLink className="w-3 h-3" />
                            Attachment
                          </a>
                        )}
                      </div>
                      <span className="mt-1 swas-meta">
                        {m.senderName} ·{' '}
                        {m.createdAt?.toDate
                          ? m.createdAt.toDate().toLocaleTimeString('en-KE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Sending'}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white border-t border-[#e1e8f2] space-y-2.5">
              {errorMsg && <p className="text-[12px] text-[#d34552]">{errorMsg}</p>}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  required
                  maxLength={1500}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 px-3.5 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 swas-btn-text swas-btn-primary rounded-[9px] disabled:opacity-60 shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
              <input
                type="url"
                maxLength={400}
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="Optional attachment URL (https://...)"
                className="w-full px-3 py-1.5 swas-input bg-[#f9fbfe] border border-[#e1e8f2] rounded-[8px] focus:outline-none focus:border-[#1265c8]"
              />
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function NotificationsView({
  notifications,
  onNavigate,
}: {
  notifications: AppNotification[];
  onNavigate: (route: WorkspaceRoute) => void;
}) {
  const [filterUnread, setFilterUnread] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const visible = filterUnread ? notifications.filter((n) => !n.read) : notifications;

  const handleOpen = async (n: AppNotification) => {
    if (!n.read) {
      await markNotificationRead(n.id);
    }
    if (n.linkRoute) {
      onNavigate(n.linkRoute as WorkspaceRoute);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilterUnread(false)}
            className={`px-3 py-1.5 swas-btn-text rounded-[8px] cursor-pointer ${
              !filterUnread ? 'bg-[#1265c8] text-white' : 'bg-white border border-[#dce5f0] text-[#42556f]'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterUnread(true)}
            className={`px-3 py-1.5 swas-btn-text rounded-[8px] cursor-pointer ${
              filterUnread ? 'bg-[#1265c8] text-white' : 'bg-white border border-[#dce5f0] text-[#42556f]'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllNotificationsRead(notifications)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 swas-btn-text bg-[#e9f2ff] text-[#1265c8] hover:text-[#0d4fa5] rounded-[8px] hover:bg-[#dcebff] cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark All Read
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="swas-card rounded-[13px] p-10 text-center">
          <Bell className="w-7 h-7 text-[#1265c8] mx-auto mb-2.5" />
          <h3 className="swas-heading-section">No notifications to show</h3>
          <p className="mt-1 swas-desc">
            Bid alerts, deliverable submissions, and security updates appear here in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleOpen(n)}
              className={`w-full text-left swas-card rounded-[12px] p-4 transition flex items-start justify-between gap-4 cursor-pointer ${
                n.read ? 'opacity-85' : 'border-[#1265c8] bg-[#f7faff]'
              }`}
            >
              <div>
                <p className="text-[14px] font-semibold text-[#172b46]">{n.title}</p>
                <p className="swas-body mt-1">{n.body}</p>
              </div>
              <div className="text-right shrink-0">
                {!n.read && (
                  <span className="block text-[11px] font-semibold text-[#1265c8]">New</span>
                )}
                <span className="swas-meta tabular-nums">
                  {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString('en-KE') : ''}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SupportView({
  supportTickets,
  onOpenPublicPolicy,
}: {
  supportTickets: SupportTicket[];
  onOpenPublicPolicy: (slug?: string | null) => void;
}) {
  const { firebaseUser, userPrivate } = useAuth();
  const [category, setCategory] = useState<SupportCategory>('Tasks & Bids');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userPrivate) return;
    setBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const ticketId = await createSupportTicket({
        userId: firebaseUser.uid,
        senderName: userPrivate.displayName,
        category,
        subject,
        message,
      });
      let emailNotice = '';
      if (firebaseUser.email) {
        const emailRes = await dispatchPlatformEmail({
          user: firebaseUser,
          surface: 'website',
          category: 'customer_support',
          recipientEmail: firebaseUser.email,
          subject: `[SWAS TASKS] Support Ticket #${ticketId.slice(-6).toUpperCase()}: ${subject}`,
          bodyText: `Hello ${userPrivate.displayName},\n\nWe received your support ticket under "${category}".\n\nSubject: ${subject}\nMessage: ${message}\n\nOur support team will respond from ${OFFICIAL_EMAIL_IDENTITY.officialEmail}.`,
        });
        emailNotice = emailRes.sent
          ? ` Email acknowledgement sent from ${OFFICIAL_EMAIL_IDENTITY.officialEmail}.`
          : ' (Email acknowledgement not sent: EMAIL SERVICE NOT CONFIGURED)';
      }
      setSuccessMsg(`Support ticket logged to your account.${emailNotice}`);
      setSubject('');
      setMessage('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send support ticket.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-6 swas-card rounded-[13px] p-6 space-y-4">
        <div className="flex items-center gap-2 text-[#1265c8]">
          <HelpCircle className="w-5 h-5" />
          <h3 className="swas-heading-section">Open a Support Ticket</h3>
        </div>
        <p className="swas-desc">
          Include task IDs, assignment names, or KES ledger references. Official support address:{' '}
          <a
            href={`mailto:${OFFICIAL_EMAIL_IDENTITY.officialEmail}`}
            className="text-[#1265c8] font-semibold hover:underline"
          >
            {OFFICIAL_EMAIL_IDENTITY.officialEmail}
          </a>
          .
        </p>

        {successMsg && (
          <div className="p-3 rounded-[9px] bg-[#eaf8f2] border border-[#bce8d4] text-[13px] text-[#15966b]">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-3 rounded-[9px] bg-[#fff0f0] border border-[#f1c7c7] text-[13px] text-[#d34552]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block swas-label mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SupportCategory)}
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            >
              <option value="Tasks & Bids">Tasks & Bids</option>
              <option value="Payments & Wallet">Payments & Wallet</option>
              <option value="Account & Security">Account & Security</option>
              <option value="General">General</option>
            </select>
          </div>
          <div>
            <label className="block swas-label mb-1">Subject</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={120}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your inquiry"
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>
          <div>
            <label className="block swas-label mb-1">Message</label>
            <textarea
              required
              minLength={10}
              maxLength={1500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the issue clearly..."
              className="w-full min-h-[110px] px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 swas-btn-text swas-btn-primary rounded-[9px] disabled:opacity-60 cursor-pointer"
          >
            {busy ? 'Sending...' : 'Submit Ticket'}
          </button>
        </form>

        <div className="pt-3 border-t border-[#e1e8f2] text-[12px] text-[#5b6d85] space-x-2">
          <span>Helpful guides:</span>
          <button
            type="button"
            onClick={() => onOpenPublicPolicy('appeals')}
            className="text-[#1265c8] font-semibold hover:underline cursor-pointer"
          >
            Appeals Policy
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => onOpenPublicPolicy('complaint-resolution')}
            className="text-[#1265c8] font-semibold hover:underline cursor-pointer"
          >
            Complaint Resolution
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => onOpenPublicPolicy('support-helpdesk')}
            className="text-[#1265c8] font-semibold hover:underline cursor-pointer"
          >
            Helpdesk Rules
          </button>
        </div>
      </div>

      <div className="lg:col-span-6 swas-card rounded-[13px] p-6 space-y-4">
        <h3 className="swas-heading-section">Your Support Tickets</h3>
        {supportTickets.length === 0 ? (
          <p className="swas-body text-[#75869d]">No support tickets created yet.</p>
        ) : (
          <div className="space-y-3">
            {supportTickets.map((tkt) => (
              <div key={tkt.id} className="p-4 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2] space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-[#1265c8]">{tkt.category}</span>
                  <span className="text-[12px] font-semibold capitalize text-[#15966b]">
                    {tkt.status}
                  </span>
                </div>
                <p className="text-[14px] font-semibold text-[#172b46]">{tkt.subject}</p>
                <p className="swas-body">{tkt.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AccountPages({
  route,
  onNavigate,
  onOpenPublicPolicy,
  onSignOut,
}: {
  route: 'profile' | 'settings' | 'security';
  onNavigate: (route: WorkspaceRoute) => void;
  onOpenPublicPolicy: (slug?: string | null) => void;
  onSignOut: () => void;
}) {
  const {
    firebaseUser,
    userPrivate,
    changeAccountPassword,
    linkGoogleToCurrentUser,
    resendVerificationEmail,
    refreshVerificationState,
  } = useAuth();

  const [displayName, setDisplayName] = useState(userPrivate?.displayName || '');
  const [phone, setPhone] = useState(userPrivate?.phone || '');
  const [photoUrl, setPhotoUrl] = useState(userPrivate?.photoUrl || '');
  const [bio, setBio] = useState(userPrivate?.bio || '');
  const [skillsRaw, setSkillsRaw] = useState((userPrivate?.skills || []).join(', '));
  const [businessName, setBusinessName] = useState(userPrivate?.businessName || '');
  const [businessIndustry, setBusinessIndustry] = useState(userPrivate?.businessIndustry || '');
  const [notifyBids, setNotifyBids] = useState(userPrivate?.notifyBids ?? true);
  const [notifyMessages, setNotifyMessages] = useState(userPrivate?.notifyMessages ?? true);
  const [notifyPayments, setNotifyPayments] = useState(userPrivate?.notifyPayments ?? true);
  const [publicProfileVisible, setPublicProfileVisible] = useState(
    userPrivate?.publicProfileVisible ?? true
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [settingsErr, setSettingsErr] = useState<string | null>(null);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkMsg, setLinkMsg] = useState<string | null>(null);
  const [linkErr, setLinkErr] = useState<string | null>(null);

  useEffect(() => {
    if (userPrivate) {
      setDisplayName(userPrivate.displayName || '');
      setPhone(userPrivate.phone || '');
      setPhotoUrl(userPrivate.photoUrl || '');
      setBio(userPrivate.bio || '');
      setSkillsRaw((userPrivate.skills || []).join(', '));
      setBusinessName(userPrivate.businessName || '');
      setBusinessIndustry(userPrivate.businessIndustry || '');
      setNotifyBids(userPrivate.notifyBids ?? true);
      setNotifyMessages(userPrivate.notifyMessages ?? true);
      setNotifyPayments(userPrivate.notifyPayments ?? true);
      setPublicProfileVisible(userPrivate.publicProfileVisible ?? true);
    }
  }, [userPrivate]);

  if (!userPrivate || !firebaseUser) return null;

  const isWorker = userPrivate.role === 'worker';
  const isPasswordUser = firebaseUser.providerData.some((p) => p.providerId === 'password');
  const isGoogleUser = firebaseUser.providerData.some((p) => p.providerId === 'google.com');
  const providerSummary =
    [isGoogleUser ? 'Google Sign-In' : null, isPasswordUser ? 'Email & Password' : null]
      .filter(Boolean)
      .join(' · ') || 'Google Sign-In';

  const handleLinkGoogle = async () => {
    setLinkBusy(true);
    setLinkMsg(null);
    setLinkErr(null);
    try {
      await linkGoogleToCurrentUser();
      setLinkMsg('Google Sign-In linked to your account successfully.');
    } catch (err) {
      setLinkErr(err instanceof Error ? err.message : 'Unable to link Google account.');
    } finally {
      setLinkBusy(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMsg(null);
    setSettingsErr(null);
    try {
      await updateUserAccountSettings(firebaseUser.uid, {
        displayName,
        phone,
        photoUrl,
        bio,
        skills: isWorker ? parseSkillsInput(skillsRaw, SCHEMA_LIMITS.skillsMaxCount) : undefined,
        businessName: !isWorker ? businessName : undefined,
        businessIndustry: !isWorker ? businessIndustry : undefined,
        notifyBids,
        notifyMessages,
        notifyPayments,
        publicProfileVisible,
      });
      setSettingsMsg('Account settings saved.');
    } catch (err) {
      setSettingsErr(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    setPwErr(null);
    if (newPw !== confirmPw) {
      setPwErr('New password confirmation does not match.');
      return;
    }
    setPwBusy(true);
    try {
      await changeAccountPassword(currentPw, newPw);
      setPwMsg('Password updated successfully.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setPwErr(err instanceof Error ? err.message : 'Unable to change password.');
    } finally {
      setPwBusy(false);
    }
  };

  if (route === 'profile') {
    const initial = (userPrivate.displayName || 'S').charAt(0).toUpperCase();
    return (
      <div className="max-w-3xl swas-card rounded-[14px] p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e1e8f2]">
          <div className="flex items-center gap-4">
            {userPrivate.photoUrl ? (
              <img
                src={userPrivate.photoUrl}
                alt={userPrivate.displayName}
                className="w-16 h-16 rounded-full object-cover border border-[#dce5f0]"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#102b50] text-white flex items-center justify-center text-xl font-bold">
                {initial}
              </div>
            )}
            <div>
              <h2 className="swas-heading-page">{userPrivate.displayName}</h2>
              <p className="text-[12px] font-medium text-[#1265c8] capitalize mt-0.5">
                {userPrivate.role} Account · {firebaseUser.emailVerified ? 'Verified Email' : 'Unverified'}
              </p>
              <p className="swas-meta mt-0.5">
                Member since{' '}
                {userPrivate.createdAt?.toDate
                  ? userPrivate.createdAt.toDate().toLocaleDateString('en-KE')
                  : 'Active'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="px-4 py-2 swas-btn-text swas-btn-primary rounded-[9px] self-start sm:self-auto cursor-pointer"
          >
            Edit Profile & Settings
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2]">
            <span className="block swas-desc">Email Address</span>
            <strong className="text-[14px] font-semibold text-[#172b46]">{userPrivate.email}</strong>
          </div>
          <div className="p-4 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2]">
            <span className="block swas-desc">Phone Number</span>
            <strong className="text-[14px] font-semibold text-[#172b46]">
              {userPrivate.phone || 'Not provided'}
            </strong>
          </div>

          {!isWorker && (
            <>
              <div className="p-4 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2]">
                <span className="block swas-desc">Business / Organization</span>
                <strong className="text-[14px] font-semibold text-[#172b46]">
                  {userPrivate.businessName || 'Not specified'}
                </strong>
              </div>
              <div className="p-4 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2]">
                <span className="block swas-desc">Industry</span>
                <strong className="text-[14px] font-semibold text-[#172b46]">
                  {userPrivate.businessIndustry || 'Not specified'}
                </strong>
              </div>
            </>
          )}
        </div>

        <div>
          <h3 className="swas-heading-section mb-1">Bio / Summary</h3>
          <p className="swas-body">
            {userPrivate.bio || 'No bio added yet. Update your bio in Account Settings.'}
          </p>
        </div>

        {isWorker && (
          <div>
            <h3 className="swas-heading-section mb-1">Skills</h3>
            <p className="text-[14px] text-[#1265c8] font-medium">
              {userPrivate.skills && userPrivate.skills.length > 0
                ? userPrivate.skills.join(' · ')
                : 'No skills listed yet.'}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (route === 'settings') {
    return (
      <div className="max-w-3xl swas-card rounded-[14px] p-6 md:p-8 space-y-5">
        <div className="flex items-center gap-2 text-[#1265c8]">
          <UserCircle className="w-5 h-5" />
          <h2 className="swas-heading-section">Account Settings</h2>
        </div>

        {settingsMsg && (
          <div className="p-3.5 rounded-[9px] bg-[#eaf8f2] border border-[#bce8d4] text-[13px] text-[#15966b]">
            {settingsMsg}
          </div>
        )}
        {settingsErr && (
          <div className="p-3.5 rounded-[9px] bg-[#fff0f0] border border-[#f1c7c7] text-[13px] text-[#d34552]">
            {settingsErr}
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block swas-label mb-1">Full Name</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={80}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>
            <div>
              <label className="block swas-label mb-1">Phone Number</label>
              <input
                type="tel"
                maxLength={24}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 7XX XXX XXX"
                className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block swas-label mb-1">Profile Photo URL (Optional)</label>
              <input
                type="url"
                maxLength={500}
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>

            {isWorker ? (
              <div className="md:col-span-2">
                <label className="block swas-label mb-1">
                  Skills (comma-separated, max 10)
                </label>
                <input
                  type="text"
                  value={skillsRaw}
                  onChange={(e) => setSkillsRaw(e.target.value)}
                  placeholder="Data Entry, Copywriting, QA Testing"
                  className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block swas-label mb-1">Business Name</label>
                  <input
                    type="text"
                    maxLength={100}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                  />
                </div>
                <div>
                  <label className="block swas-label mb-1">Industry</label>
                  <input
                    type="text"
                    maxLength={80}
                    value={businessIndustry}
                    onChange={(e) => setBusinessIndustry(e.target.value)}
                    className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="block swas-label mb-1">Bio</label>
              <textarea
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Summarize your background and marketplace goals..."
                className="w-full min-h-[92px] px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#e1e8f2] space-y-2.5">
            <p className="swas-heading-card text-[#172b46]">Notification & Privacy Preferences</p>
            <label className="flex items-center gap-2 swas-body cursor-pointer">
              <input
                type="checkbox"
                checked={notifyBids}
                onChange={(e) => setNotifyBids(e.target.checked)}
              />
              Bid and assignment status notifications
            </label>
            <label className="flex items-center gap-2 swas-body cursor-pointer">
              <input
                type="checkbox"
                checked={notifyMessages}
                onChange={(e) => setNotifyMessages(e.target.checked)}
              />
              Direct message alerts
            </label>
            <label className="flex items-center gap-2 swas-body cursor-pointer">
              <input
                type="checkbox"
                checked={notifyPayments}
                onChange={(e) => setNotifyPayments(e.target.checked)}
              />
              KES settlement and ledger notifications
            </label>
            <label className="flex items-center gap-2 swas-body cursor-pointer">
              <input
                type="checkbox"
                checked={publicProfileVisible}
                onChange={(e) => setPublicProfileVisible(e.target.checked)}
              />
              Show public marketplace profile details to counterparties
            </label>
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="px-5 py-2.5 swas-btn-text swas-btn-primary rounded-[9px] disabled:opacity-60 cursor-pointer"
          >
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </form>

        <div className="pt-3 border-t border-[#e1e8f2] flex flex-wrap items-center gap-3 text-[12px] text-[#5b6d85]">
          <span>Governance:</span>
          <button
            type="button"
            onClick={() => onNavigate('my-policies')}
            className="text-[#1265c8] font-semibold hover:underline cursor-pointer"
          >
            My Accepted Policies
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => onOpenPublicPolicy('privacy')}
            className="text-[#1265c8] font-semibold hover:underline cursor-pointer"
          >
            Privacy Policy
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => onOpenPublicPolicy('data-deletion')}
            className="text-[#1265c8] font-semibold hover:underline cursor-pointer"
          >
            Data Deletion Policy
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => onOpenPublicPolicy('account-security')}
            className="text-[#1265c8] font-semibold hover:underline cursor-pointer"
          >
            Security Rules
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="swas-card rounded-[14px] p-6 space-y-4">
        <div className="flex items-center gap-2 text-[#15966b]">
          <ShieldCheck className="w-5 h-5" />
          <h2 className="swas-heading-section">Account Security Status</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2]">
            <span className="block swas-desc">Email Verification</span>
            <strong className="text-[14px] font-semibold text-[#15966b]">
              {firebaseUser.emailVerified ? 'Verified' : 'Pending Verification'}
            </strong>
          </div>
          <div className="p-4 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2]">
            <span className="block swas-desc">Authentication Method</span>
            <strong className="text-[14px] font-semibold text-[#172b46]">
              {providerSummary}
            </strong>
          </div>
        </div>

        {linkMsg && (
          <div className="p-3 rounded-[9px] bg-[#eaf8f2] border border-[#bce8d4] text-[13px] text-[#15966b]">
            {linkMsg}
          </div>
        )}
        {linkErr && (
          <div className="p-3 rounded-[9px] bg-[#fff0f0] border border-[#f1c7c7] text-[13px] text-[#d34552]">
            {linkErr}
          </div>
        )}

        {!isGoogleUser && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#e1e8f2]">
            <p className="swas-desc">
              Link your Google account for faster, one-click authentication on SWAS TASKS.
            </p>
            <button
              type="button"
              disabled={linkBusy}
              onClick={handleLinkGoogle}
              className="px-4 py-2 bg-white border border-[#dce5f0] text-[#172b46] swas-btn-text rounded-[9px] hover:bg-[#e9f2ff] disabled:opacity-60 cursor-pointer"
            >
              {linkBusy ? 'Linking...' : 'Link Google Account'}
            </button>
          </div>
        )}

        {!firebaseUser.emailVerified && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => resendVerificationEmail()}
              className="px-3.5 py-2 swas-btn-text swas-btn-primary rounded-[8px] cursor-pointer"
            >
              Resend Verification Email
            </button>
            <button
              type="button"
              onClick={() => refreshVerificationState()}
              className="px-3.5 py-2 swas-btn-text bg-[#e9f2ff] text-[#1265c8] rounded-[8px] cursor-pointer"
            >
              Refresh Status
            </button>
          </div>
        )}
      </div>

      <div className="swas-card rounded-[14px] p-6 space-y-4">
        <div className="flex items-center gap-2 text-[#1265c8]">
          <KeyRound className="w-5 h-5" />
          <h3 className="swas-heading-section">Change Password</h3>
        </div>

        {!isPasswordUser ? (
          <p className="swas-body">
            Your account authenticates via Google Sign-In. Manage your password and two-factor settings directly in your Google Account.
          </p>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
            {pwMsg && (
              <div className="p-3 rounded-[9px] bg-[#eaf8f2] border border-[#bce8d4] text-[13px] text-[#15966b]">
                {pwMsg}
              </div>
            )}
            {pwErr && (
              <div className="p-3 rounded-[9px] bg-[#fff0f0] border border-[#f1c7c7] text-[13px] text-[#d34552]">
                {pwErr}
              </div>
            )}

            <div>
              <label className="block swas-label mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block swas-label mb-1">New Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                />
              </div>
              <div>
                <label className="block swas-label mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={pwBusy}
              className="px-4 py-2 swas-btn-text swas-btn-primary rounded-[9px] disabled:opacity-60 cursor-pointer"
            >
              {pwBusy ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>

      <div className="swas-card rounded-[14px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="swas-heading-section">Session Control</h3>
          <p className="swas-desc mt-0.5">
            Sign out of your SWAS TASKS session on this browser.
          </p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex items-center gap-2 px-4 py-2 swas-btn-text bg-[#fff0f0] text-[#d34552] border border-[#f1c7c7] rounded-[9px] hover:bg-[#ffe2e2] cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
