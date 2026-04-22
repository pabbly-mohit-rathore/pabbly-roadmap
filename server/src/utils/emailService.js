// ============================================================
// EMAIL SERVICE (Nodemailer)
//
// Mirrors the webPush.js API — same payload shape:
//   { title, body, url, adminUrl?, type }
//
// Usage:
//   sendEmailToUser(userId, payload)
//   sendEmailToUsers([userIds], payload)
//
// Fire-and-forget: errors are logged, never thrown to callers.
// If SMTP env vars are missing, email dispatch is a no-op (warn once).
// ============================================================

const nodemailer = require('nodemailer');
const prisma = require('../config/database');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Pabbly Roadmap';
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SMTP_USER;
const APP_URL = (process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

let transporter = null;
let smtpConfigured = false;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    smtpConfigured = true;
    console.log(`[email] SMTP configured — ${SMTP_HOST}:${SMTP_PORT} (secure=${SMTP_SECURE})`);

    transporter.verify().then(
      () => console.log('[email] SMTP connection verified'),
      (err) => console.error('[email] SMTP verify failed:', err.message)
    );
  } catch (err) {
    console.error('[email] Transporter setup failed:', err.message);
  }
} else {
  console.warn('[email] SMTP not configured (SMTP_HOST / SMTP_USER / SMTP_PASS missing) — email disabled');
}

// ============================================================
// URL resolver — admins get admin routes, everyone else gets user routes.
// Converts relative path to absolute URL using APP_URL.
// ============================================================
function resolveUrlForUser(payload, userRole) {
  const path = (userRole === 'admin' && payload.adminUrl) ? payload.adminUrl : (payload.url || '/');
  if (/^https?:\/\//i.test(path)) return path;
  return `${APP_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

// ============================================================
// HTML email template — simple, clean, inline styles (no external CSS).
// ============================================================
function buildHtml({ recipientName, title, body, ctaUrl, type }) {
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : 'Hi there,';
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);
  const footerLine = type ? `You received this because you're subscribed to <b>${escapeHtml(type.replace(/_/g, ' '))}</b> notifications on Pabbly Roadmap.` : `You received this from Pabbly Roadmap.`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f4f6f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:24px 32px;">
              <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.3px;">Pabbly Roadmap</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px 0;color:#6b7280;font-size:14px;">${greeting}</p>
              <h1 style="margin:0 0 12px 0;color:#111827;font-size:22px;line-height:1.3;font-weight:700;">${safeTitle}</h1>
              <p style="margin:0 0 24px 0;color:#374151;font-size:15px;line-height:1.6;">${safeBody}</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" bgcolor="#4f46e5" style="border-radius:8px;">
                    <a href="${escapeAttr(ctaUrl)}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">View in Roadmap</a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">${footerLine}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">&copy; Pabbly Roadmap · <a href="${escapeAttr(APP_URL)}" style="color:#6366f1;text-decoration:none;">Open dashboard</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildText({ recipientName, title, body, ctaUrl }) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi there,';
  return `${greeting}\n\n${title}\n\n${body}\n\nView: ${ctaUrl}\n\n— Pabbly Roadmap`;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(s) {
  return String(s || '').replace(/"/g, '&quot;');
}

// ============================================================
// Send email to a single user
// ============================================================
async function sendEmailToUser(userId, payload) {
  if (!smtpConfigured) return;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, role: true, isActive: true },
    });

    if (!user || !user.email || !user.isActive) {
      console.log(`[email] Skipping ${userId} — user missing/inactive/no-email`);
      return;
    }

    const ctaUrl = resolveUrlForUser(payload, user.role);
    const subject = payload.title || 'Pabbly Roadmap notification';
    const html = buildHtml({ recipientName: user.name, title: payload.title, body: payload.body, ctaUrl, type: payload.type });
    const text = buildText({ recipientName: user.name, title: payload.title, body: payload.body, ctaUrl });

    await transporter.sendMail({
      from: FROM_EMAIL ? `"${FROM_NAME}" <${FROM_EMAIL}>` : FROM_NAME,
      to: user.email,
      subject,
      text,
      html,
    });

    console.log(`[email] Sent to ${user.email} — ${subject}`);
  } catch (err) {
    console.error(`[email] Send failed for user ${userId}:`, err.message);
  }
}

// ============================================================
// Batch — fire all in parallel, swallow individual errors
// ============================================================
async function sendEmailToUsers(userIds, payload) {
  if (!smtpConfigured || !userIds || userIds.length === 0) return;
  await Promise.all(userIds.map((id) => sendEmailToUser(id, payload).catch(() => {})));
}

module.exports = { sendEmailToUser, sendEmailToUsers };
