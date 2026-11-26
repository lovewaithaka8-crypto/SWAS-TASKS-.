import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  RefreshCw,
  Save,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  EMAIL_CATEGORIES,
  OFFICIAL_EMAIL_IDENTITY,
  type EmailCategoryId,
} from '../lib/emailConfig';
import {
  dispatchPlatformEmail,
  fetchEmailServiceStatus,
  saveCentralEmailSettings,
  sendTestEmailFromControlCentre,
} from '../lib/emailService';
import type {
  CentralEmailSettings,
  EmailDeliveryLog,
  EmailServiceStatusResponse,
  WorkspaceRoute,
} from '../types/marketplace';

interface ControlCentrePagesProps {
  route: 'control-centre' | 'platform-settings';
  emailSettings: CentralEmailSettings;
  emailLogs: EmailDeliveryLog[];
  onNavigate: (route: WorkspaceRoute) => void;
  onOpenPublicPolicy?: (slug?: string | null) => void;
}

export function ControlCentrePages({
  route,
  emailSettings,
  emailLogs,
  onNavigate,
  onOpenPublicPolicy,
}: ControlCentrePagesProps) {
  const { firebaseUser, isSuperAdmin } = useAuth();
  const [statusData, setStatusData] = useState<EmailServiceStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const loadStatus = async (verify = false) => {
    if (!firebaseUser || !isSuperAdmin) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await fetchEmailServiceStatus(firebaseUser, verify);
      setStatusData(res);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Unable to fetch email service status.');
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus(false);
  }, [firebaseUser?.uid, isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div className="swas-card rounded-[14px] p-8 text-center space-y-2">
        <ShieldAlert className="w-8 h-8 text-[#d34552] mx-auto" />
        <h2 className="swas-heading-section">Restricted Access</h2>
        <p className="swas-body text-[#75869d]">
          SWAS TASKS Central Control Centre is restricted to verified Super Administrators.
        </p>
      </div>
    );
  }

  if (route === 'control-centre') {
    return (
      <CentralControlCentreOverview
        emailSettings={emailSettings}
        emailLogs={emailLogs}
        statusData={statusData}
        statusLoading={statusLoading}
        statusError={statusError}
        onRefreshStatus={() => void loadStatus(true)}
        onNavigate={onNavigate}
        onOpenPublicPolicy={onOpenPublicPolicy}
      />
    );
  }

  return (
    <PlatformEmailSettingsView
      emailSettings={emailSettings}
      emailLogs={emailLogs}
      statusData={statusData}
      statusLoading={statusLoading}
      statusError={statusError}
      onVerifyConnection={() => void loadStatus(true)}
    />
  );
}

function StatusBanner({
  statusData,
  statusLoading,
  statusError,
  onVerify,
}: {
  statusData: EmailServiceStatusResponse | null;
  statusLoading: boolean;
  statusError: string | null;
  onVerify: () => void;
}) {
  const isConfigured = Boolean(statusData?.configured);

  return (
    <div
      className={`rounded-[13px] p-4 border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        statusError
          ? 'bg-[#fff0f0] border-[#f1c7c7]'
          : isConfigured
          ? 'bg-[#eaf8f2] border-[#bce8d4]'
          : 'bg-[#fff8ec] border-[#f5dca8]'
      }`}
    >
      <div className="flex items-start gap-3">
        {isConfigured ? (
          <CheckCircle2 className="w-5 h-5 text-[#15966b] shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-[#d99527] shrink-0 mt-0.5" />
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-[12px] font-bold tracking-wide uppercase ${
                isConfigured ? 'text-[#15966b]' : 'text-[#9b6611]'
              }`}
            >
              {statusData?.statusLabel || 'EMAIL SERVICE NOT CONFIGURED'}
            </span>
            <span className="text-[12px] text-[#42556f]">
              · Sender: <strong>{OFFICIAL_EMAIL_IDENTITY.senderName}</strong> &lt;
              {OFFICIAL_EMAIL_IDENTITY.officialEmail}&gt;
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[#42556f] leading-relaxed">
            {statusError ||
              statusData?.verificationDetail ||
              'EMAIL SERVICE NOT CONFIGURED: Configure SMTP_USER and SMTP_PASS in server environment variables to enable live delivery.'}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={statusLoading}
        onClick={onVerify}
        className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-white border border-[#dce5f0] text-[#172b46] swas-btn-text rounded-[9px] hover:bg-[#e9f2ff] disabled:opacity-60 shrink-0 cursor-pointer"
      >
        <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
        {statusLoading ? 'Checking...' : 'Verify Connection'}
      </button>
    </div>
  );
}

function CentralControlCentreOverview({
  emailSettings,
  emailLogs,
  statusData,
  statusLoading,
  statusError,
  onRefreshStatus,
  onNavigate,
  onOpenPublicPolicy,
}: {
  emailSettings: CentralEmailSettings;
  emailLogs: EmailDeliveryLog[];
  statusData: EmailServiceStatusResponse | null;
  statusLoading: boolean;
  statusError: string | null;
  onRefreshStatus: () => void;
  onNavigate: (route: WorkspaceRoute) => void;
  onOpenPublicPolicy?: (slug?: string | null) => void;
}) {
  const { firebaseUser } = useAuth();
  const controlCentreCategories = useMemo(
    () =>
      EMAIL_CATEGORIES.filter(
        (c) => c.scope === 'control_centre' || c.id === 'general_announcement'
      ),
    []
  );

  const [category, setCategory] = useState<EmailCategoryId>('staff_invitation');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState(
    emailSettings.subjectTemplates?.staff_invitation ||
      '[SWAS TASKS CENTRAL CONTROL CENTRE] Department Staff Invitation'
  );
  const [bodyText, setBodyText] = useState('');
  const [sending, setSending] = useState(false);
  const [dispatchNotice, setDispatchNotice] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const sentCount = useMemo(() => emailLogs.filter((l) => l.status === 'sent').length, [emailLogs]);
  const failedCount = useMemo(
    () => emailLogs.filter((l) => l.status === 'failed' || l.status === 'not_configured').length,
    [emailLogs]
  );

  const handleCategoryChange = (nextCat: EmailCategoryId) => {
    setCategory(nextCat);
    const tpl = emailSettings.subjectTemplates?.[nextCat];
    const def = controlCentreCategories.find((c) => c.id === nextCat)?.defaultSubject;
    if (tpl || def) setSubject(tpl || def || '');
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setSending(true);
    setDispatchNotice(null);
    const surface = category === 'general_announcement' ? 'website' : 'control_centre';
    const res = await dispatchPlatformEmail({
      user: firebaseUser,
      surface,
      category,
      recipientEmail: recipientEmail.trim(),
      subject: subject.trim(),
      bodyText: bodyText.trim(),
    });
    setSending(false);

    if (res.sent) {
      setDispatchNotice({
        ok: true,
        text: `Email confirmed accepted by provider (Message ID: ${res.messageId || 'Confirmed'}).`,
      });
      setBodyText('');
    } else {
      setDispatchNotice({
        ok: false,
        text:
          res.status === 'not_configured'
            ? 'EMAIL SERVICE NOT CONFIGURED — Email was NOT sent and has been recorded in Failed Email Records.'
            : `Delivery failed: ${res.error || 'Unknown SMTP error'}`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="swas-card rounded-[14px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold text-[#1265c8] uppercase tracking-wide">
            Private Operations Suite
          </p>
          <h2 className="swas-heading-main mt-0.5">SWAS TASKS CENTRAL CONTROL CENTRE</h2>
          <p className="swas-body mt-1">
            Dispatch verified staff invitations, security alerts, department circulars, and system announcements using official sender{' '}
            <strong className="text-[#172b46]">{OFFICIAL_EMAIL_IDENTITY.officialEmail}</strong>.{' '}
            {onOpenPublicPolicy && (
              <button
                type="button"
                onClick={() => onOpenPublicPolicy('staff-conduct')}
                className="text-[#1265c8] font-semibold hover:underline cursor-pointer"
              >
                Staff & Admin Conduct Policy
              </button>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('admin-operations')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-[#102b50] text-white swas-btn-text rounded-[9px] hover:bg-[#1265c8] whitespace-nowrap cursor-pointer"
          >
            Operations &amp; Review Suite
          </button>
          <button
            type="button"
            onClick={() => onNavigate('policy-control')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-[#e9f2ff] text-[#1265c8] swas-btn-text rounded-[9px] hover:bg-[#dcebff] whitespace-nowrap cursor-pointer"
          >
            Policy Control Centre
          </button>
          <button
            type="button"
            onClick={() => onNavigate('platform-settings')}
            className="inline-flex items-center gap-2 px-4 py-2.5 swas-btn-primary swas-btn-text rounded-[9px] whitespace-nowrap cursor-pointer"
          >
            <Settings2 className="w-4 h-4" />
            Platform Email Settings
          </button>
        </div>
      </div>

      <StatusBanner
        statusData={statusData}
        statusLoading={statusLoading}
        statusError={statusError}
        onVerify={onRefreshStatus}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="swas-card rounded-[13px] p-5">
          <span className="swas-heading-card">Official Sender Identity</span>
          <div className="mt-2 text-[15px] font-bold text-[#172b46] break-all">
            {OFFICIAL_EMAIL_IDENTITY.officialEmail}
          </div>
          <p className="mt-1 swas-desc">
            Display: {OFFICIAL_EMAIL_IDENTITY.senderName} · Reply-To: {OFFICIAL_EMAIL_IDENTITY.replyTo}
          </p>
        </div>

        <div className="swas-card rounded-[13px] p-5">
          <span className="swas-heading-card">Confirmed Sent Emails</span>
          <div className="mt-2 swas-stat text-[#15966b]">{sentCount}</div>
          <p className="mt-1 swas-desc">Verified provider acceptance logs</p>
        </div>

        <div className="swas-card rounded-[13px] p-5">
          <span className="swas-heading-card">Failed / Unconfigured</span>
          <div className="mt-2 swas-stat text-[#d34552]">{failedCount}</div>
          <p className="mt-1 swas-desc">Logged attempts requiring attention</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 swas-card rounded-[13px] p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#1265c8]">
            <Send className="w-5 h-5" />
            <h3 className="swas-heading-section">Official Control Centre Dispatch</h3>
          </div>
          <p className="swas-desc">
            All communications below use sender identity{' '}
            <strong>
              {OFFICIAL_EMAIL_IDENTITY.senderName} &lt;{OFFICIAL_EMAIL_IDENTITY.officialEmail}&gt;
            </strong>
            .
          </p>

          {dispatchNotice && (
            <div
              className={`p-3.5 rounded-[9px] border text-[13px] ${
                dispatchNotice.ok
                  ? 'bg-[#eaf8f2] border-[#bce8d4] text-[#15966b]'
                  : 'bg-[#fff0f0] border-[#f1c7c7] text-[#d34552]'
              }`}
            >
              {dispatchNotice.text}
            </div>
          )}

          <form onSubmit={handleDispatch} className="space-y-3.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block swas-label mb-1">Communication Category</label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value as EmailCategoryId)}
                  className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                >
                  {controlCentreCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block swas-label mb-1">Recipient Email Address</label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="staff.member@example.com"
                  className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                />
              </div>
            </div>

            <div>
              <label className="block swas-label mb-1">Email Subject Line</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>

            <div>
              <label className="block swas-label mb-1">Official Message Content</label>
              <textarea
                required
                minLength={5}
                maxLength={4000}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Write the official staff invitation, department update, or system announcement..."
                className="w-full min-h-[130px] px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-2 px-5 py-2.5 swas-btn-primary swas-btn-text rounded-[9px] disabled:opacity-60 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Dispatching...' : 'Send Official Email'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-5 swas-card rounded-[13px] p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="swas-heading-section">Recent Outgoing Logs</h3>
            <button
              type="button"
              onClick={() => onNavigate('platform-settings')}
              className="text-[12px] font-semibold swas-link hover:underline cursor-pointer"
            >
              Full Audit Log
            </button>
          </div>

          {emailLogs.length === 0 ? (
            <p className="swas-body text-[#75869d]">
              No outgoing email events logged yet. Every sent, failed, or unconfigured attempt appears here.
            </p>
          ) : (
            <div className="space-y-2.5">
              {emailLogs.slice(0, 6).map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2] space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-[#172b46] truncate">
                      {log.recipientEmail}
                    </span>
                    <span
                      className={`text-[11px] font-bold uppercase ${
                        log.status === 'sent'
                          ? 'text-[#15966b]'
                          : log.status === 'not_configured'
                          ? 'text-[#9b6611]'
                          : 'text-[#d34552]'
                      }`}
                    >
                      {log.status === 'not_configured' ? 'NOT CONFIGURED' : log.status}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#42556f] truncate">{log.subject}</p>
                  <p className="swas-meta">
                    {log.surface === 'control_centre' ? 'Central Control Centre' : 'Public Website'} ·{' '}
                    {log.createdAt?.toDate
                      ? log.createdAt.toDate().toLocaleString('en-KE')
                      : 'Just now'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlatformEmailSettingsView({
  emailSettings,
  emailLogs,
  statusData,
  statusLoading,
  statusError,
  onVerifyConnection,
}: {
  emailSettings: CentralEmailSettings;
  emailLogs: EmailDeliveryLog[];
  statusData: EmailServiceStatusResponse | null;
  statusLoading: boolean;
  statusError: string | null;
  onVerifyConnection: () => void;
}) {
  const { firebaseUser } = useAuth();
  const [testRecipient, setTestRecipient] = useState(firebaseUser?.email || '');
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  const [logTab, setLogTab] = useState<'all' | 'failed'>('all');

  const [spfLabel, setSpfLabel] = useState(emailSettings.spfStatusLabel);
  const [dkimLabel, setDkimLabel] = useState(emailSettings.dkimStatusLabel);
  const [dmarcLabel, setDmarcLabel] = useState(emailSettings.dmarcStatusLabel);
  const [enabledCats, setEnabledCats] = useState<Record<string, boolean>>(
    emailSettings.enabledCategories
  );
  const [subjectTpls, setSubjectTpls] = useState<Record<string, string>>(
    emailSettings.subjectTemplates
  );
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setSpfLabel(emailSettings.spfStatusLabel);
    setDkimLabel(emailSettings.dkimStatusLabel);
    setDmarcLabel(emailSettings.dmarcStatusLabel);
    setEnabledCats(emailSettings.enabledCategories);
    setSubjectTpls(emailSettings.subjectTemplates);
  }, [emailSettings]);

  const websiteCategories = useMemo(
    () => EMAIL_CATEGORIES.filter((c) => c.scope === 'website'),
    []
  );
  const controlCentreCategories = useMemo(
    () => EMAIL_CATEGORIES.filter((c) => c.scope === 'control_centre'),
    []
  );

  const failedLogs = useMemo(
    () => emailLogs.filter((l) => l.status === 'failed' || l.status === 'not_configured'),
    [emailLogs]
  );
  const visibleLogs = logTab === 'failed' ? failedLogs : emailLogs;

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setTestBusy(true);
    setTestResult(null);
    const res = await sendTestEmailFromControlCentre(firebaseUser, testRecipient.trim());
    setTestBusy(false);

    if (res.sent) {
      setTestResult({
        ok: true,
        text: `Test email sent successfully from ${OFFICIAL_EMAIL_IDENTITY.officialEmail} (Message ID: ${
          res.messageId || 'Confirmed'
        }).`,
      });
    } else {
      setTestResult({
        ok: false,
        text:
          res.status === 'not_configured'
            ? 'EMAIL SERVICE NOT CONFIGURED — Set SMTP_USER and SMTP_PASS in server secrets before testing.'
            : `Test email failed: ${res.error || 'Provider rejected request'}`,
      });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setSaving(true);
    setSaveNotice(null);
    try {
      await saveCentralEmailSettings(firebaseUser.uid, {
        spfStatusLabel: spfLabel,
        dkimStatusLabel: dkimLabel,
        dmarcStatusLabel: dmarcLabel,
        enabledCategories: enabledCats,
        subjectTemplates: subjectTpls,
      });
      setSaveNotice({
        ok: true,
        text: 'Central Email Settings and notification templates saved.',
      });
    } catch (err) {
      setSaveNotice({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to save central email settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="swas-card rounded-[14px] p-6 space-y-2">
        <div className="flex items-center gap-2 text-[#1265c8]">
          <Mail className="w-5 h-5" />
          <span className="text-[12px] font-semibold uppercase tracking-wide">
            Super Administrator · Central Email Configuration
          </span>
        </div>
        <h2 className="swas-heading-main">Platform Settings & Official Email System</h2>
        <p className="swas-body">
          Manage the unified SWAS TASKS sender identity, verify live SMTP delivery, inspect SPF/DKIM/DMARC readiness, and review delivery & failed email records.
        </p>
      </div>

      <StatusBanner
        statusData={statusData}
        statusLoading={statusLoading}
        statusError={statusError}
        onVerify={onVerifyConnection}
      />

      {/* Sender Identity + Verification & DNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 swas-card rounded-[13px] p-6 space-y-4">
          <h3 className="swas-heading-section">Official Sender Identity</h3>
          <div className="space-y-3">
            <div className="p-3.5 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2]">
              <span className="block swas-desc">Official Platform Email</span>
              <strong className="text-[15px] font-bold text-[#172b46]">
                {OFFICIAL_EMAIL_IDENTITY.officialEmail}
              </strong>
            </div>
            <div className="p-3.5 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2]">
              <span className="block swas-desc">Sender Display Name</span>
              <strong className="text-[14px] font-semibold text-[#172b46]">
                {OFFICIAL_EMAIL_IDENTITY.senderName}
              </strong>
            </div>
            <div className="p-3.5 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2]">
              <span className="block swas-desc">Reply-To Address</span>
              <strong className="text-[14px] font-semibold text-[#172b46]">
                {OFFICIAL_EMAIL_IDENTITY.replyTo}
              </strong>
            </div>
            <div className="p-3.5 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2]">
              <span className="block swas-desc">Server Connection Status</span>
              <strong
                className={`text-[13px] font-bold uppercase ${
                  statusData?.configured ? 'text-[#15966b]' : 'text-[#9b6611]'
                }`}
              >
                {statusData?.statusLabel || 'EMAIL SERVICE NOT CONFIGURED'}
              </strong>
              <span className="block swas-meta mt-0.5">
                SMTP Host: {statusData?.smtpHostLabel || 'Not configured'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-[10px] bg-[#f7faff] border border-[#dce5f0] text-[12px] text-[#42556f] leading-relaxed">
            <strong>Security Policy:</strong> SMTP passwords, Gmail App Passwords, and OAuth secrets must ONLY be configured in server environment secrets (
            <code>SMTP_USER</code>, <code>SMTP_PASS</code>, <code>SMTP_HOST</code>, <code>SMTP_PORT</code>). Credentials are never stored in Firestore or exposed in browser code.
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          {/* Test Email Function */}
          <div className="swas-card rounded-[13px] p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#1265c8]">
              <Send className="w-5 h-5" />
              <h3 className="swas-heading-section">Test Email Verification</h3>
            </div>
            <p className="swas-desc">
              Send a real verification email from <strong>{OFFICIAL_EMAIL_IDENTITY.officialEmail}</strong> to test SMTP delivery end-to-end.
            </p>

            {testResult && (
              <div
                className={`p-3.5 rounded-[9px] border text-[13px] ${
                  testResult.ok
                    ? 'bg-[#eaf8f2] border-[#bce8d4] text-[#15966b]'
                    : 'bg-[#fff0f0] border-[#f1c7c7] text-[#d34552]'
                }`}
              >
                {testResult.text}
              </div>
            )}

            <form onSubmit={handleTestEmail} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1 px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
              <button
                type="submit"
                disabled={testBusy}
                className="px-5 py-2.5 swas-btn-primary swas-btn-text rounded-[9px] disabled:opacity-60 shrink-0 cursor-pointer"
              >
                {testBusy ? 'Sending Test...' : 'Send Test Email'}
              </button>
            </form>
          </div>

          {/* SPF, DKIM, DMARC Verification Status */}
          <div className="swas-card rounded-[13px] p-6 space-y-3.5">
            <div className="flex items-center gap-2 text-[#15966b]">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="swas-heading-section">Email Authentication (SPF, DKIM & DMARC)</h3>
            </div>
            <p className="swas-desc">
              Verification status:{' '}
              <strong className="uppercase text-[#172b46]">
                {statusData?.verificationStatus || 'not_configured'}
              </strong>
            </p>
            <div className="space-y-2.5 text-[13px] text-[#42556f]">
              <div className="p-3 rounded-[9px] bg-[#f9fbfe] border border-[#e1e8f2]">
                {statusData?.dnsGuidance.spf ||
                  'SPF: Configure SMTP / Google Workspace SPF records to authorize SWAS TASKS outbound mail.'}
              </div>
              <div className="p-3 rounded-[9px] bg-[#f9fbfe] border border-[#e1e8f2]">
                {statusData?.dnsGuidance.dkim ||
                  'DKIM: Enable cryptographic DKIM signing in your mail provider for high inbox deliverability.'}
              </div>
              <div className="p-3 rounded-[9px] bg-[#f9fbfe] border border-[#e1e8f2]">
                {statusData?.dnsGuidance.dmarc ||
                  `DMARC: Publish _dmarc policy pointing forensic/aggregate reports to ${OFFICIAL_EMAIL_IDENTITY.officialEmail}.`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Delivery Logs & Failed Records */}
      <div className="swas-card rounded-[13px] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="swas-heading-section">Email Delivery Audit & Failed Records</h3>
            <p className="swas-desc mt-0.5">
              Immutable delivery log across both the public SWAS TASKS website and SWAS TASKS Central Control Centre.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLogTab('all')}
              className={`px-3.5 py-1.5 swas-btn-text rounded-[8px] cursor-pointer ${
                logTab === 'all'
                  ? 'bg-[#1265c8] text-white'
                  : 'bg-[#f3f6fa] text-[#42556f] hover:bg-[#e9f2ff]'
              }`}
            >
              Email Delivery Logs ({emailLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setLogTab('failed')}
              className={`px-3.5 py-1.5 swas-btn-text rounded-[8px] cursor-pointer ${
                logTab === 'failed'
                  ? 'bg-[#d34552] text-white'
                  : 'bg-[#f3f6fa] text-[#42556f] hover:bg-[#fff0f0]'
              }`}
            >
              Failed Email Records ({failedLogs.length})
            </button>
          </div>
        </div>

        {visibleLogs.length === 0 ? (
          <p className="swas-body text-[#75869d] py-6 text-center">
            {logTab === 'failed'
              ? 'No failed or unconfigured email records recorded.'
              : 'No email delivery events logged yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse swas-table">
              <thead>
                <tr className="border-b border-[#e1e8f2] text-[#75869d]">
                  <th className="py-2.5 pr-4 font-semibold">Timestamp</th>
                  <th className="py-2.5 pr-4 font-semibold">Platform Surface</th>
                  <th className="py-2.5 pr-4 font-semibold">Category</th>
                  <th className="py-2.5 pr-4 font-semibold">Recipient</th>
                  <th className="py-2.5 pr-4 font-semibold">Subject</th>
                  <th className="py-2.5 pr-4 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold">Provider Ref / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1e8f2]">
                {visibleLogs.slice(0, 50).map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 pr-4 text-[#75869d] whitespace-nowrap tabular-nums">
                      {log.createdAt?.toDate
                        ? log.createdAt.toDate().toLocaleString('en-KE')
                        : 'Pending'}
                    </td>
                    <td className="py-3 pr-4 font-medium text-[#172b46] whitespace-nowrap">
                      {log.surface === 'control_centre' ? 'Central Control Centre' : 'Public Website'}
                    </td>
                    <td className="py-3 pr-4 text-[#42556f] whitespace-nowrap">{log.category}</td>
                    <td className="py-3 pr-4 font-medium text-[#172b46]">{log.recipientEmail}</td>
                    <td className="py-3 pr-4 text-[#42556f] max-w-[240px] truncate">{log.subject}</td>
                    <td className="py-3 pr-4 whitespace-nowrap font-bold uppercase text-[11px]">
                      <span
                        className={
                          log.status === 'sent'
                            ? 'text-[#15966b]'
                            : log.status === 'not_configured'
                            ? 'text-[#9b6611]'
                            : 'text-[#d34552]'
                        }
                      >
                        {log.status === 'not_configured' ? 'NOT CONFIGURED' : log.status}
                      </span>
                    </td>
                    <td className="py-3 text-[12px] text-[#75869d] max-w-[240px] truncate">
                      {log.providerMessageId || log.errorMessage || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Email Notification Settings & Templates */}
      <form onSubmit={handleSaveSettings} className="swas-card rounded-[13px] p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="swas-heading-section">Email Notification Settings & Subject Templates</h3>
            <p className="swas-desc mt-0.5">
              Configure enabled notification categories and subject lines for both websites (always sent from{' '}
              <strong>{OFFICIAL_EMAIL_IDENTITY.officialEmail}</strong>).
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 swas-btn-primary swas-btn-text rounded-[9px] disabled:opacity-60 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Email Settings'}
          </button>
        </div>

        {saveNotice && (
          <div
            className={`p-3.5 rounded-[9px] border text-[13px] ${
              saveNotice.ok
                ? 'bg-[#eaf8f2] border-[#bce8d4] text-[#15966b]'
                : 'bg-[#fff0f0] border-[#f1c7c7] text-[#d34552]'
            }`}
          >
            {saveNotice.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div>
            <label className="block swas-label mb-1">SPF Audit Note</label>
            <input
              type="text"
              maxLength={120}
              value={spfLabel}
              onChange={(e) => setSpfLabel(e.target.value)}
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>
          <div>
            <label className="block swas-label mb-1">DKIM Audit Note</label>
            <input
              type="text"
              maxLength={120}
              value={dkimLabel}
              onChange={(e) => setDkimLabel(e.target.value)}
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>
          <div>
            <label className="block swas-label mb-1">DMARC Audit Note</label>
            <input
              type="text"
              maxLength={120}
              value={dmarcLabel}
              onChange={(e) => setDmarcLabel(e.target.value)}
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[14px] font-bold text-[#102b50] uppercase tracking-wide">
            1. Public SWAS TASKS Website Notifications (11 Categories)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {websiteCategories.map((cat) => (
              <div
                key={cat.id}
                className="p-4 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2] space-y-2.5"
              >
                <label className="flex items-start justify-between gap-3 cursor-pointer">
                  <div>
                    <span className="block text-[13px] font-semibold text-[#172b46]">{cat.label}</span>
                    <span className="block swas-desc mt-0.5">{cat.description}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enabledCats[cat.id] ?? true}
                    onChange={(e) =>
                      setEnabledCats((prev) => ({ ...prev, [cat.id]: e.target.checked }))
                    }
                    className="mt-1 w-4 h-4 accent-[#1265c8]"
                  />
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={subjectTpls[cat.id] ?? cat.defaultSubject}
                  onChange={(e) =>
                    setSubjectTpls((prev) => ({ ...prev, [cat.id]: e.target.value }))
                  }
                  aria-label={`${cat.label} subject template`}
                  className="w-full px-3 py-1.5 swas-input bg-white border border-[#dce5f0] rounded-[8px]"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-[#e1e8f2]">
          <h4 className="text-[14px] font-bold text-[#102b50] uppercase tracking-wide">
            2. Private SWAS TASKS CENTRAL CONTROL CENTRE Notifications (10 Categories)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {controlCentreCategories.map((cat) => (
              <div
                key={cat.id}
                className="p-4 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2] space-y-2.5"
              >
                <label className="flex items-start justify-between gap-3 cursor-pointer">
                  <div>
                    <span className="block text-[13px] font-semibold text-[#172b46]">{cat.label}</span>
                    <span className="block swas-desc mt-0.5">{cat.description}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enabledCats[cat.id] ?? true}
                    onChange={(e) =>
                      setEnabledCats((prev) => ({ ...prev, [cat.id]: e.target.checked }))
                    }
                    className="mt-1 w-4 h-4 accent-[#1265c8]"
                  />
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={subjectTpls[cat.id] ?? cat.defaultSubject}
                  onChange={(e) =>
                    setSubjectTpls((prev) => ({ ...prev, [cat.id]: e.target.value }))
                  }
                  aria-label={`${cat.label} subject template`}
                  className="w-full px-3 py-1.5 swas-input bg-white border border-[#dce5f0] rounded-[8px]"
                />
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
