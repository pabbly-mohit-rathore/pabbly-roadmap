// ============================================================
// WEBHOOK CONTROLLER
//
// Admin-only CRUD for webhooks:
//   - getWebhooks       — list all (with delivery stats)
//   - getEvents         — returns available event registry
//   - createWebhook     — add new webhook
//   - updateWebhook     — edit name/url/events/isActive
//   - deleteWebhook     — remove (cascades deliveries)
//   - toggleWebhook     — flip isActive on/off
//   - testWebhook       — fire a fake event to verify delivery
// ============================================================

const prisma = require('../config/database');
const { WEBHOOK_EVENTS, WEBHOOK_EVENT_VALUES } = require('../utils/webhookEvents');
const { dispatchWebhook } = require('../utils/webhookDispatcher');

function requireAdmin(req, res) {
  if (req.user.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Only admins can manage webhooks.' });
    return false;
  }
  return true;
}

// Returns the list of possible events (for the frontend dropdown)
const getEvents = (_req, res) => {
  res.json({ success: true, data: { events: WEBHOOK_EVENTS } });
};

const getWebhooks = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;

    const webhooks = await prisma.webhook.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { deliveries: true } },
      },
    });

    res.json({ success: true, data: { webhooks } });
  } catch (err) { next(err); }
};

const createWebhook = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { name, url, events, isActive = true, secret } = req.body;
    const { userId } = req.user;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Webhook name is required.' });
    }
    if (!url || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ success: false, message: 'A valid URL (http:// or https://) is required.' });
    }
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one event.' });
    }
    const invalid = events.filter((e) => !WEBHOOK_EVENT_VALUES.includes(e));
    if (invalid.length > 0) {
      return res.status(400).json({ success: false, message: `Unknown event(s): ${invalid.join(', ')}` });
    }

    const webhook = await prisma.webhook.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        events,
        isActive: !!isActive,
        secret: secret ? secret.trim() : null,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { deliveries: true } },
      },
    });

    res.status(201).json({ success: true, message: 'Webhook created.', data: { webhook } });
  } catch (err) { next(err); }
};

const updateWebhook = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const { name, url, events, isActive, secret } = req.body;

    const existing = await prisma.webhook.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Webhook not found.' });
    }

    if (url !== undefined && !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ success: false, message: 'A valid URL is required.' });
    }
    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ success: false, message: 'Select at least one event.' });
      }
      const invalid = events.filter((e) => !WEBHOOK_EVENT_VALUES.includes(e));
      if (invalid.length > 0) {
        return res.status(400).json({ success: false, message: `Unknown event(s): ${invalid.join(', ')}` });
      }
    }

    const webhook = await prisma.webhook.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(url !== undefined && { url: url.trim() }),
        ...(events !== undefined && { events }),
        ...(isActive !== undefined && { isActive: !!isActive }),
        ...(secret !== undefined && { secret: secret ? secret.trim() : null }),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { deliveries: true } },
      },
    });

    res.json({ success: true, message: 'Webhook updated.', data: { webhook } });
  } catch (err) { next(err); }
};

const deleteWebhook = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const existing = await prisma.webhook.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Webhook not found.' });
    }

    await prisma.webhook.delete({ where: { id } });
    res.json({ success: true, message: 'Webhook deleted.' });
  } catch (err) { next(err); }
};

const toggleWebhook = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const existing = await prisma.webhook.findUnique({ where: { id }, select: { isActive: true } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Webhook not found.' });
    }

    const webhook = await prisma.webhook.update({
      where: { id },
      data: { isActive: !existing.isActive },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { deliveries: true } },
      },
    });

    res.json({
      success: true,
      message: `Webhook ${webhook.isActive ? 'activated' : 'deactivated'}.`,
      data: { webhook },
    });
  } catch (err) { next(err); }
};

const testWebhook = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook not found.' });
    }

    // Force-fire using the first subscribed event (or fallback to post.created)
    const event = webhook.events[0] || 'post.created';
    // Temporarily upsert isActive true for this single dispatch? No — we just
    // bypass the filter by calling deliverOne-style logic here. Simpler: use
    // dispatchWebhook which queries by isActive + event match. So if inactive,
    // we can't use it. Inline-send instead:
    const { dispatchWebhook: _dispatch } = require('../utils/webhookDispatcher');
    // Set isActive TRUE temporarily in-memory; easier: just call the low-level.
    // But deliverOne is not exported. So the cleanest path: toggle on, dispatch,
    // toggle back. But that's racy. Best: always allow test on inactive via a
    // forced helper. Let's just call a direct POST here.
    const crypto = require('crypto');
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data: { test: true, message: 'This is a test payload from Pabbly Roadmap.' },
    };
    const body = JSON.stringify(payload);
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Pabbly-Roadmap-Webhook/1.0',
      'X-Pabbly-Event': event,
      'X-Pabbly-Webhook-Id': webhook.id,
      'X-Pabbly-Test': 'true',
    };
    if (webhook.secret) {
      const sig = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');
      headers['X-Pabbly-Signature'] = `sha256=${sig}`;
    }

    let statusCode = null;
    let responseBody = null;
    let error = null;
    const started = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const result = await fetch(webhook.url, { method: 'POST', headers, body, signal: controller.signal })
        .finally(() => clearTimeout(timer));
      statusCode = result.status;
      const text = await result.text().catch(() => '');
      responseBody = text.substring(0, 2048);
    } catch (err) {
      error = err.name === 'AbortError' ? 'Request timed out' : (err.message || 'Network error');
    }
    const durationMs = Date.now() - started;

    await prisma.webhookDelivery.create({
      data: { webhookId: webhook.id, event, payload: body, statusCode, responseBody, error, durationMs },
    }).catch(() => {});

    res.json({
      success: !error && statusCode && statusCode < 400,
      message: error
        ? `Test failed: ${error}`
        : `Test sent — target responded with ${statusCode} in ${durationMs}ms.`,
      data: { statusCode, durationMs, error, responseBody },
    });
  } catch (err) { next(err); }
};

module.exports = {
  getEvents,
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  toggleWebhook,
  testWebhook,
};
