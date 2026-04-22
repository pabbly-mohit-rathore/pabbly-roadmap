// ============================================================
// WEBHOOK DISPATCHER
//
// When an event fires in any controller, call:
//   dispatchWebhook('post.created', { post: {...} })
//
// Behavior:
//   - Find all ACTIVE webhooks that subscribed to this event
//   - POST JSON to each URL (fire-and-forget, non-blocking)
//   - Log every delivery in webhook_deliveries table (for debug)
//   - 10-second timeout per request
//   - If HMAC `secret` set on webhook, sign body with SHA-256 and
//     include `X-Pabbly-Signature: sha256=<hex>` header
// ============================================================

const crypto = require('crypto');
const prisma = require('../config/database');

const TIMEOUT_MS = 10_000;
const MAX_RESPONSE_LEN = 2_048; // truncate stored response body

async function dispatchWebhook(event, data) {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: {
        isActive: true,
        events: { has: event },
      },
      select: { id: true, url: true, secret: true, name: true },
    });

    if (webhooks.length === 0) return;

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };
    const body = JSON.stringify(payload);

    console.log(`[webhook] Dispatching "${event}" to ${webhooks.length} webhook(s)`);

    // Fire-and-forget — errors logged per-webhook, never thrown
    webhooks.forEach((w) => {
      deliverOne(w, event, body).catch(() => {});
    });
  } catch (err) {
    console.error('[webhook] dispatch lookup failed:', err.message);
  }
}

async function deliverOne(webhook, event, body) {
  const started = Date.now();
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Pabbly-Roadmap-Webhook/1.0',
    'X-Pabbly-Event': event,
    'X-Pabbly-Webhook-Id': webhook.id,
  };

  if (webhook.secret) {
    const sig = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');
    headers['X-Pabbly-Signature'] = `sha256=${sig}`;
  }

  let statusCode = null;
  let responseBody = null;
  let error = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    statusCode = res.status;
    const text = await res.text().catch(() => '');
    responseBody = text.substring(0, MAX_RESPONSE_LEN);

    if (!res.ok) {
      console.warn(`[webhook] "${webhook.name}" ${res.status} for event ${event}`);
    }
  } catch (err) {
    error = err.name === 'AbortError' ? 'Request timed out' : (err.message || 'Network error');
    console.error(`[webhook] "${webhook.name}" failed for event ${event}: ${error}`);
  }

  const durationMs = Date.now() - started;

  prisma.webhookDelivery.create({
    data: {
      webhookId: webhook.id,
      event,
      payload: body,
      statusCode,
      responseBody,
      error,
      durationMs,
    },
  }).catch((err) => console.error('[webhook] delivery log failed:', err.message));
}

module.exports = { dispatchWebhook };
