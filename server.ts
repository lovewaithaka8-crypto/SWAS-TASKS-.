import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { type DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth, adminDb } from './server/lib/firebaseAdmin';
import { registerOperationalRoutes } from './server/routes/operationalRoutes';
import { runScheduledMaintenanceSweep } from './server/cron/reviewEngine';
import { getAllProviderStatuses, getProviderModule } from './server/providers/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OFFICIAL_EMAIL = 'swastaskorg@gmail.com';
const PLATFORM_NAME = 'SWAS TASKS';
const SENDER_NAME = 'SWAS TASKS';
const REPLY_TO = 'swastaskorg@gmail.com';
const DEFAULT_SUPER_ADMIN_EMAIL = 'lovewaithaka8@gmail.com';

const ADMIN_ONLY_CATEGORIES = new Set([
  'general_announcement',
  'staff_invitation',
  'staff_registration',
  'admin_notification',
  'security_alert',
  'cc_account_verification',
  'cc_password_reset',
  'cc_login_alert',
  'department_notification',
  'system_announcement',
  'admin_communication',
]);

const ALLOWED_CATEGORIES = new Set([
  'client_registration',
  'worker_registration',
  'account_verification',
  'password_reset',
  'login_security',
  'task_notification',
  'bid_assignment_notification',
  'payment_notification',
  'withdrawal_notification',
  'customer_support',
  'general_announcement',
  'staff_invitation',
  'staff_registration',
  'admin_notification',
  'security_alert',
  'cc_account_verification',
  'cc_password_reset',
  'cc_login_alert',
  'department_notification',
  'system_announcement',
  'admin_communication',
  'test_email',
]);

// Firebase Admin SDK initialized cleanly via ./server/lib/firebaseAdmin (swas-tasks-control-centre target)

interface AuthenticatedRequest extends Request {
  authToken?: DecodedIdToken;
}

function isSuperAdminToken(decoded?: DecodedIdToken): boolean {
  if (!decoded || decoded.email_verified !== true || !decoded.email) return false;
  const emailLower = decoded.email.trim().toLowerCase();
  const extraAdmins = (process.env.SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return emailLower === DEFAULT_SUPER_ADMIN_EMAIL || extraAdmins.includes(emailLower);
}

async function requireVerifiedAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization Bearer token.' });
    return;
  }
  const idToken = authHeader.slice(7).trim();
  if (!idToken) {
    res.status(401).json({ error: 'Empty Authorization token.' });
    return;
  }
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (decoded.email_verified !== true) {
      res.status(403).json({ error: 'Email verification is required.' });
      return;
    }
    req.authToken = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

async function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (isSuperAdminToken(req.authToken)) {
    next();
    return;
  }
  if (req.authToken?.uid && req.authToken.email_verified === true) {
    try {
      const snap = await adminDb.collection('admins').doc(req.authToken.uid).get();
      if (snap.exists) {
        next();
        return;
      }
    } catch {
      // fall through to 403
    }
  }
  res.status(403).json({
    error: 'Super Administrator authorization is required for SWAS TASKS Central Control Centre.',
  });
}

interface SmtpSettings {
  configured: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

function readSmtpSettings(): SmtpSettings {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  const explicitHost = (process.env.SMTP_HOST || '').trim();
  const host = explicitHost || (user && pass ? 'smtp.gmail.com' : '');
  const portRaw = Number(process.env.SMTP_PORT || 465);
  const port = Number.isFinite(portRaw) && portRaw > 0 ? portRaw : 465;
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE.toLowerCase() === 'true'
      : port === 465;

  return {
    configured: Boolean(host && user && pass),
    host,
    port,
    secure,
    user,
    pass,
  };
}

function createSmtpTransporter(cfg: SmtpSettings) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });
}

function isValidEmailAddress(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildBrandedHtmlEmail(params: {
  surface: 'website' | 'control_centre';
  categoryLabel: string;
  subject: string;
  bodyText: string;
}): string {
  const bannerSubtitle =
    params.surface === 'control_centre'
      ? 'SWAS TASKS CENTRAL CONTROL CENTRE'
      : 'SWAS TASKS PLATFORM NOTIFICATION';
  const safeSubject = escapeHtml(params.subject);
  const safeSubtitle = escapeHtml(bannerSubtitle);
  const safeCategory = escapeHtml(params.categoryLabel);
  const safeBody = escapeHtml(params.bodyText).replace(/\r?\n/g, '<br />');

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background:#edf2f8;font-family:Arial,Helvetica,sans-serif;color:#172b46;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #dce5f0;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="background:#102b50;padding:22px 28px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.2px;color:#8faac9;text-transform:uppercase;">${safeSubtitle}</div>
        <div style="margin-top:4px;font-size:20px;font-weight:800;color:#ffffff;">${PLATFORM_NAME}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:26px 28px;">
        <div style="font-size:12px;font-weight:700;color:#1265c8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;">${safeCategory}</div>
        <h1 style="margin:0 0 14px;font-size:18px;font-weight:700;color:#172b46;line-height:1.35;">${safeSubject}</h1>
        <div style="font-size:14px;line-height:1.65;color:#334866;">${safeBody}</div>
      </td>
    </tr>
    <tr>
      <td style="background:#f5f8fc;border-top:1px solid #e1e8f2;padding:16px 28px;font-size:12px;color:#75869d;line-height:1.5;">
        Sent by <strong style="color:#172b46;">${SENDER_NAME}</strong> (${OFFICIAL_EMAIL})<br />
        Reply-To: ${REPLY_TO}
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildDnsGuidance(smtp: SmtpSettings) {
  return {
    spf: smtp.configured
      ? `SPF: Gmail / configured SMTP (${smtp.host}) manages outbound SPF for ${OFFICIAL_EMAIL}. If you later switch to a custom domain (e.g. @swastasks.com), add "v=spf1 include:_spf.google.com ~all" in DNS TXT.`
      : `SPF: Pending SMTP configuration. When sending via Google/Gmail SMTP for ${OFFICIAL_EMAIL}, Google SPF applies; for custom domains publish "v=spf1 include:_spf.google.com ~all".`,
    dkim: smtp.configured
      ? 'DKIM: Enable DKIM signing via your Workspace/SMTP provider so outgoing headers carry cryptographic DKIM signatures.'
      : 'DKIM: Enable 2048-bit DKIM keys in your email provider / Google Workspace Admin once SMTP is connected.',
    dmarc: `DMARC: Publish a TXT record at _dmarc.<domain> (e.g. "v=DMARC1; p=quarantine; rua=mailto:${OFFICIAL_EMAIL}") when using a custom domain.`,
  };
}

const processedIdempotencyKeys = new Map<string, { status: string; message: string; at: number }>();

async function startServer() {
  const app = express();

  // Raw body parser exclusively for cryptographic webhook signature verification
  app.post(
    '/api/financial/webhooks/:provider',
    express.raw({ type: 'application/json', limit: '128kb' }),
    (req: Request, res: Response) => {
      const providerId = String(req.params.provider || '').trim().toLowerCase();
      const mod = getProviderModule(providerId);
      if (!mod) {
        res.status(404).json({ received: false, error: 'Unsupported payment provider.' });
        return;
      }
      if (!mod.isConfigured()) {
        res.status(503).json({
          received: false,
          error: `${mod.name} webhook secret is not configured.`,
        });
        return;
      }
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
      const check = mod.verifyWebhookSignature(rawBody, req.headers);
      if (!check.verified) {
        res.status(401).json({ received: false, error: check.reason || 'Signature verification failed.' });
        return;
      }
      res.json({ received: true, verified: true, provider: mod.id, eventType: check.eventType || 'verified' });
    }
  );

  app.use(express.json({ limit: '128kb' }));

  // Mount Operational Platform Routes (Registration Approval, Dual-Source Tasks, 90m Engine, Ledger, Withdrawals, Reports)
  registerOperationalRoutes(app);

  app.get(
    '/api/financial/providers/status',
    requireVerifiedAuth,
    requireSuperAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      const verify = req.query.verify === 'true';
      const providers = await getAllProviderStatuses(verify);
      res.json({ providers });
    }
  );

  app.post(
    '/api/financial/payouts/initiate',
    requireVerifiedAuth,
    requireSuperAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      const body = (req.body || {}) as {
        providerKey?: string;
        withdrawalId?: string;
        amount?: number;
        currency?: string;
        destination?: string;
        recipientName?: string;
        institutionId?: string;
        idempotencyKey?: string;
        cryptoNetwork?: string;
      };

      const providerKey = String(body.providerKey || '').trim().toLowerCase();
      const idempotencyKey = String(body.idempotencyKey || '').trim();
      const withdrawalId = String(body.withdrawalId || '').trim();
      const amount = Number(body.amount || 0);
      const currency = String(body.currency || 'KES').trim().toUpperCase();
      const destination = String(body.destination || '').trim();
      const recipientName = String(body.recipientName || '').trim();
      const institutionId = String(body.institutionId || '').trim();

      if (!withdrawalId || !idempotencyKey || !Number.isFinite(amount) || amount <= 0 || !destination) {
        res.status(400).json({
          dispatched: false,
          error: 'withdrawalId, idempotencyKey, valid amount, and destination are required.',
        });
        return;
      }

      const existingIdem = processedIdempotencyKeys.get(idempotencyKey);
      if (existingIdem) {
        res.status(409).json({
          dispatched: false,
          duplicate: true,
          status: existingIdem.status,
          error: `Duplicate idempotency key detected (${existingIdem.message}).`,
        });
        return;
      }

      const mod = getProviderModule(providerKey);
      if (!mod) {
        res.status(501).json({
          dispatched: false,
          code: 'MANUAL_PAYOUT_REQUIRED',
          status: 'manual_required',
          error: 'This institution uses manual finance settlement. Mark as paid only after settling externally and recording a real reference.',
        });
        return;
      }

      if (!mod.isConfigured()) {
        res.status(503).json({
          dispatched: false,
          code: 'PROVIDER_NOT_CONFIGURED',
          status: 'not_configured',
          error: `${mod.name} API credentials are not configured on this server.`,
        });
        return;
      }

      const result = await mod.initiatePayout({
        withdrawalId,
        amount,
        currency,
        destination,
        recipientName,
        institutionId,
        idempotencyKey,
        cryptoNetwork: body.cryptoNetwork,
      });

      if (!result.dispatched) {
        res.status(result.status === 'not_configured' ? 503 : 501).json({
          dispatched: false,
          code: result.status === 'not_configured' ? 'PROVIDER_NOT_CONFIGURED' : 'MANUAL_PAYOUT_REQUIRED',
          status: result.status,
          error: result.message,
        });
        return;
      }

      processedIdempotencyKeys.set(idempotencyKey, {
        status: result.status,
        message: result.message,
        at: Date.now(),
      });
      res.json(result);
    }
  );

  app.get(
    '/api/financial/exchange-rates',
    requireVerifiedAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      const base = String(req.query.base || 'KES').trim().toUpperCase().replace(/[^A-Z]/g, '');
      const apiKey = (process.env.EXCHANGE_RATE_API_KEY || '').trim();
      if (!apiKey) {
        res.json({
          available: false,
          base,
          reason:
            'No verified exchange rate API is configured. Balances remain strictly isolated in each currency without conversion.',
        });
        return;
      }
      try {
        const resp = await fetch(
          `https://v6.exchangerate-api.com/v6/${encodeURIComponent(apiKey)}/latest/${encodeURIComponent(base)}`
        );
        if (!resp.ok) {
          res.json({
            available: false,
            base,
            reason: `Verified exchange rate source returned HTTP ${resp.status}.`,
          });
          return;
        }
        const data = (await resp.json()) as { result?: string; conversion_rates?: Record<string, number> };
        if (data.result !== 'success' || !data.conversion_rates) {
          res.json({
            available: false,
            base,
            reason: 'Exchange rate provider response unavailable.',
          });
          return;
        }
        res.json({
          available: true,
          base,
          rates: {
            KES: data.conversion_rates.KES,
            UGX: data.conversion_rates.UGX,
            TZS: data.conversion_rates.TZS,
            RWF: data.conversion_rates.RWF,
            NGN: data.conversion_rates.NGN,
            USD: data.conversion_rates.USD,
          },
          fetchedAt: new Date().toISOString(),
        });
      } catch {
        res.json({
          available: false,
          base,
          reason: 'Unable to reach verified exchange rate source.',
        });
      }
    }
  );

  app.get(
    '/api/email/status',
    requireVerifiedAuth,
    requireSuperAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      const smtp = readSmtpSettings();
      const shouldVerify = req.query.verify === 'true';

      if (!smtp.configured) {
        res.json({
          configured: false,
          statusLabel: 'EMAIL SERVICE NOT CONFIGURED',
          officialEmail: OFFICIAL_EMAIL,
          senderName: SENDER_NAME,
          replyTo: REPLY_TO,
          smtpHostLabel: 'Not configured',
          verificationStatus: 'not_configured',
          verificationDetail:
            'EMAIL SERVICE NOT CONFIGURED: Set SMTP_USER and SMTP_PASS (and optionally SMTP_HOST, SMTP_PORT) in server environment variables.',
          dnsGuidance: buildDnsGuidance(smtp),
        });
        return;
      }

      let verificationStatus: 'verified' | 'unverified' = 'unverified';
      let verificationDetail = `SMTP credentials loaded for ${smtp.host}:${smtp.port}. Click Verify Connection to run live handshake.`;

      if (shouldVerify) {
        try {
          const transporter = createSmtpTransporter(smtp);
          await transporter.verify();
          verificationStatus = 'verified';
          verificationDetail = `Live SMTP connection verified with ${smtp.host}:${smtp.port}. Sender identity ${SENDER_NAME} <${OFFICIAL_EMAIL}> ready.`;
        } catch (err) {
          verificationStatus = 'unverified';
          verificationDetail = `SMTP verification failed: ${
            err instanceof Error ? err.message : 'Unable to reach SMTP server.'
          }`;
        }
      }

      res.json({
        configured: true,
        statusLabel: 'CONNECTED',
        officialEmail: OFFICIAL_EMAIL,
        senderName: SENDER_NAME,
        replyTo: REPLY_TO,
        smtpHostLabel: `${smtp.host}:${smtp.port}`,
        verificationStatus,
        verificationDetail,
        dnsGuidance: buildDnsGuidance(smtp),
      });
    }
  );

  app.post(
    '/api/email/test',
    requireVerifiedAuth,
    requireSuperAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      const body = (req.body || {}) as {
        recipientEmail?: string;
        subject?: string;
        message?: string;
      };
      const recipientEmail = (body.recipientEmail || '').trim();
      if (!isValidEmailAddress(recipientEmail)) {
        res.status(400).json({
          sent: false,
          status: 'failed',
          error: 'Provide a valid recipient email address for the test email.',
        });
        return;
      }

      const smtp = readSmtpSettings();
      if (!smtp.configured) {
        res.status(503).json({
          sent: false,
          status: 'not_configured',
          code: 'EMAIL_SERVICE_NOT_CONFIGURED',
          error:
            'EMAIL SERVICE NOT CONFIGURED: Set SMTP_USER and SMTP_PASS in server environment variables before sending test emails.',
        });
        return;
      }

      const subject = (body.subject || `[${PLATFORM_NAME}] Central Control Centre Test Email`)
        .trim()
        .slice(0, 200);
      const messageText = (
        body.message ||
        `This is a verified test email from SWAS TASKS Central Control Centre.\n\nOfficial Email: ${OFFICIAL_EMAIL}\nSender Display Name: ${SENDER_NAME}\nReply-To: ${REPLY_TO}\nTriggered By: ${req.authToken?.email || 'Super Administrator'}`
      )
        .trim()
        .slice(0, 4000);

      try {
        const transporter = createSmtpTransporter(smtp);
        const info = await transporter.sendMail({
          from: `"${SENDER_NAME}" <${OFFICIAL_EMAIL}>`,
          replyTo: REPLY_TO,
          to: recipientEmail,
          subject,
          text: messageText,
          html: buildBrandedHtmlEmail({
            surface: 'control_centre',
            categoryLabel: 'Central Email Verification Test',
            subject,
            bodyText: messageText,
          }),
        });

        res.json({
          sent: true,
          status: 'sent',
          messageId: info.messageId || '',
        });
      } catch (err) {
        res.status(502).json({
          sent: false,
          status: 'failed',
          error: err instanceof Error ? err.message : 'SMTP provider rejected the test email.',
        });
      }
    }
  );

  app.post(
    '/api/email/send',
    requireVerifiedAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      const body = (req.body || {}) as {
        recipientEmail?: string;
        surface?: 'website' | 'control_centre';
        category?: string;
        categoryLabel?: string;
        subject?: string;
        bodyText?: string;
      };

      const recipientEmail = (body.recipientEmail || '').trim();
      const surface = body.surface === 'control_centre' ? 'control_centre' : 'website';
      const category = (body.category || '').trim();
      const categoryLabel = (body.categoryLabel || category || 'Platform Notification')
        .trim()
        .slice(0, 120);
      const subject = (body.subject || '').trim().slice(0, 200);
      const bodyText = (body.bodyText || '').trim().slice(0, 4000);

      if (!isValidEmailAddress(recipientEmail)) {
        res.status(400).json({
          sent: false,
          status: 'failed',
          error: 'Invalid recipient email address.',
        });
        return;
      }

      if (!ALLOWED_CATEGORIES.has(category)) {
        res.status(400).json({
          sent: false,
          status: 'failed',
          error: 'Unsupported email notification category.',
        });
        return;
      }

      const requiresAdmin = surface === 'control_centre' || ADMIN_ONLY_CATEGORIES.has(category);
      if (requiresAdmin && !isSuperAdminToken(req.authToken)) {
        res.status(403).json({
          sent: false,
          status: 'failed',
          error: 'Administrator permissions are required to send Control Centre or broadcast emails.',
        });
        return;
      }

      if (subject.length < 2 || bodyText.length < 2) {
        res.status(400).json({
          sent: false,
          status: 'failed',
          error: 'Subject and message body are required.',
        });
        return;
      }

      const smtp = readSmtpSettings();
      if (!smtp.configured) {
        res.status(503).json({
          sent: false,
          status: 'not_configured',
          code: 'EMAIL_SERVICE_NOT_CONFIGURED',
          error: 'EMAIL SERVICE NOT CONFIGURED',
        });
        return;
      }

      try {
        const transporter = createSmtpTransporter(smtp);
        const info = await transporter.sendMail({
          from: `"${SENDER_NAME}" <${OFFICIAL_EMAIL}>`,
          replyTo: REPLY_TO,
          to: recipientEmail,
          subject,
          text: bodyText,
          html: buildBrandedHtmlEmail({
            surface,
            categoryLabel,
            subject,
            bodyText,
          }),
        });

        res.json({
          sent: true,
          status: 'sent',
          messageId: info.messageId || '',
        });
      } catch (err) {
        res.status(502).json({
          sent: false,
          status: 'failed',
          error: err instanceof Error ? err.message : 'SMTP delivery failed.',
        });
      }
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const url = req.originalUrl;
        const indexPath = path.resolve(__dirname, 'index.html');
        const template = fs.readFileSync(indexPath, 'utf-8');
        const html = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`SWAS TASKS server running on http://0.0.0.0:${port}`);
    // Non-blocking background scheduler for 90-minute auto-approval & task expiration sweeps
    setInterval(() => {
      void runScheduledMaintenanceSweep('scheduler').then((summary) => {
        if (!summary.ok && !summary.blockedByPermissions && summary.error) {
          console.warn('[90m Review Engine]', summary.error);
        }
      });
    }, 60_000);
  });
}

void startServer();
