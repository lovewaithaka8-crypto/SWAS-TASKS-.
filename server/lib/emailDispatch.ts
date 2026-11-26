import nodemailer from 'nodemailer';

export const OFFICIAL_EMAIL = 'swastaskorg@gmail.com';
export const PLATFORM_NAME = 'SWAS TASKS';
export const SENDER_NAME = 'SWAS TASKS';
export const REPLY_TO = 'swastaskorg@gmail.com';

export interface SmtpSettings {
  configured: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

export function readSmtpSettings(): SmtpSettings {
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

export function createSmtpTransporter(cfg: SmtpSettings) {
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildBrandedHtmlEmail(params: {
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

export async function sendOperationalEmailBestEffort(params: {
  to: string;
  subject: string;
  categoryLabel: string;
  bodyText: string;
  surface?: 'website' | 'control_centre';
}): Promise<{ sent: boolean; messageId?: string; reason?: string }> {
  const recipient = (params.to || '').trim();
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return { sent: false, reason: 'invalid_recipient' };
  }
  const smtp = readSmtpSettings();
  if (!smtp.configured) {
    return { sent: false, reason: 'smtp_not_configured' };
  }
  try {
    const transporter = createSmtpTransporter(smtp);
    const info = await transporter.sendMail({
      from: `"${SENDER_NAME}" <${OFFICIAL_EMAIL}>`,
      replyTo: REPLY_TO,
      to: recipient,
      subject: params.subject,
      text: params.bodyText,
      html: buildBrandedHtmlEmail({
        surface: params.surface || 'website',
        categoryLabel: params.categoryLabel,
        subject: params.subject,
        bodyText: params.bodyText,
      }),
    });
    return { sent: true, messageId: info.messageId || '' };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : 'smtp_error' };
  }
}
