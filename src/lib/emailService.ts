import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { cleanText } from './validation';
import {
  buildDefaultCategoryStates,
  buildDefaultSubjectTemplates,
  EMAIL_CATEGORY_MAP,
  OFFICIAL_EMAIL_IDENTITY,
  type EmailCategoryId,
  type EmailSurfaceScope,
} from './emailConfig';
import type {
  CentralEmailSettings,
  EmailDeliveryLog,
  EmailDeliveryStatus,
  EmailServiceStatusResponse,
} from '../types/marketplace';

function generateEmailLogId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `elog_${ts}_${rand}`;
}

function sortLogsDesc(items: EmailDeliveryLog[]): EmailDeliveryLog[] {
  return [...items].sort(
    (a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
  );
}

export function buildDefaultCentralEmailSettings(updatedBy = 'system'): CentralEmailSettings {
  return {
    id: 'central',
    platformName: OFFICIAL_EMAIL_IDENTITY.platformName,
    senderEmail: OFFICIAL_EMAIL_IDENTITY.officialEmail,
    senderName: OFFICIAL_EMAIL_IDENTITY.senderName,
    replyToEmail: OFFICIAL_EMAIL_IDENTITY.replyTo,
    spfStatusLabel: 'Google SPF Managed / Custom Domain Guide Ready',
    dkimStatusLabel: 'Provider DKIM Signing Recommended',
    dmarcStatusLabel: 'DMARC Policy Guidance Available',
    enabledCategories: buildDefaultCategoryStates(),
    subjectTemplates: buildDefaultSubjectTemplates(),
    updatedBy,
  };
}

async function writeEmailDeliveryLog(params: {
  actorId: string;
  surface: EmailSurfaceScope;
  category: string;
  recipientEmail: string;
  subject: string;
  status: EmailDeliveryStatus;
  providerMessageId?: string;
  errorMessage?: string;
}): Promise<void> {
  const logId = generateEmailLogId();
  const payload: Record<string, unknown> = {
    actorId: params.actorId,
    surface: params.surface,
    category: cleanText(params.category, 64),
    recipientEmail: cleanText(params.recipientEmail, 254),
    senderEmail: OFFICIAL_EMAIL_IDENTITY.officialEmail,
    senderName: OFFICIAL_EMAIL_IDENTITY.senderName,
    replyToEmail: OFFICIAL_EMAIL_IDENTITY.replyTo,
    subject: cleanText(params.subject, 200) || '[SWAS TASKS] Notification',
    status: params.status,
    createdAt: serverTimestamp(),
  };

  if (params.providerMessageId) {
    payload.providerMessageId = cleanText(params.providerMessageId, 200);
  }
  if (params.errorMessage) {
    payload.errorMessage = cleanText(params.errorMessage, 500);
  }

  try {
    await setDoc(doc(db, 'emailLogs', logId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `emailLogs/${logId}`);
  }
}

export async function fetchEmailServiceStatus(
  user: User,
  verify = false
): Promise<EmailServiceStatusResponse> {
  const token = await user.getIdToken();
  const res = await fetch(`/api/email/status${verify ? '?verify=true' : ''}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || `Failed to check email service status (${res.status}).`);
  }

  return (await res.json()) as EmailServiceStatusResponse;
}

export interface EmailDispatchResult {
  sent: boolean;
  status: EmailDeliveryStatus;
  messageId?: string;
  error?: string;
}

export async function sendTestEmailFromControlCentre(
  user: User,
  recipientEmail: string
): Promise<EmailDispatchResult> {
  const token = await user.getIdToken();
  const subject = '[SWAS TASKS] Central Control Centre Verification Test Email';
  let result: EmailDispatchResult;

  try {
    const res = await fetch('/api/email/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ recipientEmail }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      sent?: boolean;
      status?: EmailDeliveryStatus;
      messageId?: string;
      error?: string;
    };

    if (res.ok && data.sent) {
      result = {
        sent: true,
        status: 'sent',
        messageId: data.messageId,
      };
    } else {
      result = {
        sent: false,
        status: data.status === 'not_configured' ? 'not_configured' : 'failed',
        error: data.error || 'EMAIL SERVICE NOT CONFIGURED',
      };
    }
  } catch (err) {
    result = {
      sent: false,
      status: 'failed',
      error: err instanceof Error ? err.message : 'Network error calling email service.',
    };
  }

  await writeEmailDeliveryLog({
    actorId: user.uid,
    surface: 'control_centre',
    category: 'test_email',
    recipientEmail,
    subject,
    status: result.status,
    providerMessageId: result.messageId,
    errorMessage: result.error,
  }).catch(() => undefined);

  return result;
}

export async function dispatchPlatformEmail(params: {
  user?: User | null;
  surface: EmailSurfaceScope;
  category: EmailCategoryId;
  recipientEmail: string;
  subject?: string;
  bodyText: string;
}): Promise<EmailDispatchResult> {
  const activeUser = params.user || auth.currentUser;
  const catDef = EMAIL_CATEGORY_MAP[params.category];
  const resolvedSubject = cleanText(
    params.subject || catDef?.defaultSubject || '[SWAS TASKS] Platform Notification',
    200
  );

  if (!activeUser || !activeUser.emailVerified || !params.recipientEmail) {
    return {
      sent: false,
      status: 'failed',
      error: 'Verified user session and recipient email are required.',
    };
  }

  let result: EmailDispatchResult;
  try {
    const token = await activeUser.getIdToken();
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipientEmail: params.recipientEmail,
        surface: params.surface,
        category: params.category,
        categoryLabel: catDef?.label || params.category,
        subject: resolvedSubject,
        bodyText: params.bodyText,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      sent?: boolean;
      status?: EmailDeliveryStatus;
      messageId?: string;
      error?: string;
    };

    if (res.ok && data.sent) {
      result = {
        sent: true,
        status: 'sent',
        messageId: data.messageId,
      };
    } else {
      result = {
        sent: false,
        status: data.status === 'not_configured' ? 'not_configured' : 'failed',
        error: data.error || 'EMAIL SERVICE NOT CONFIGURED',
      };
    }
  } catch (err) {
    result = {
      sent: false,
      status: 'failed',
      error: err instanceof Error ? err.message : 'Unable to reach email service.',
    };
  }

  await writeEmailDeliveryLog({
    actorId: activeUser.uid,
    surface: params.surface,
    category: params.category,
    recipientEmail: params.recipientEmail,
    subject: resolvedSubject,
    status: result.status,
    providerMessageId: result.messageId,
    errorMessage: result.error,
  }).catch(() => undefined);

  return result;
}

export function subscribeCentralEmailSettings(
  onData: (settings: CentralEmailSettings) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'emailSettings', 'central'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Omit<CentralEmailSettings, 'id'>;
        onData({ id: snap.id, ...data });
      } else {
        onData(buildDefaultCentralEmailSettings());
      }
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'emailSettings/central')
  );
}

export async function saveCentralEmailSettings(
  adminUid: string,
  payload: {
    spfStatusLabel: string;
    dkimStatusLabel: string;
    dmarcStatusLabel: string;
    enabledCategories: Record<string, boolean>;
    subjectTemplates: Record<string, string>;
  }
): Promise<void> {
  const sanitizedSubjects: Record<string, string> = {};
  for (const [key, val] of Object.entries(payload.subjectTemplates).slice(0, 30)) {
    sanitizedSubjects[cleanText(key, 64)] = cleanText(val, 200);
  }

  const sanitizedToggles: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(payload.enabledCategories).slice(0, 30)) {
    sanitizedToggles[cleanText(key, 64)] = Boolean(val);
  }

  try {
    await setDoc(doc(db, 'emailSettings', 'central'), {
      platformName: OFFICIAL_EMAIL_IDENTITY.platformName,
      senderEmail: OFFICIAL_EMAIL_IDENTITY.officialEmail,
      senderName: OFFICIAL_EMAIL_IDENTITY.senderName,
      replyToEmail: OFFICIAL_EMAIL_IDENTITY.replyTo,
      spfStatusLabel: cleanText(payload.spfStatusLabel, 120) || 'Configured',
      dkimStatusLabel: cleanText(payload.dkimStatusLabel, 120) || 'Configured',
      dmarcStatusLabel: cleanText(payload.dmarcStatusLabel, 120) || 'Configured',
      enabledCategories: sanitizedToggles,
      subjectTemplates: sanitizedSubjects,
      updatedBy: adminUid,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'emailSettings/central');
  }
}

export function subscribeEmailLogs(
  onData: (logs: EmailDeliveryLog[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'emailLogs'),
    (snap) => {
      onData(
        sortLogsDesc(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<EmailDeliveryLog, 'id'> & { createdAt?: Timestamp }),
          }))
        )
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'emailLogs')
  );
}
