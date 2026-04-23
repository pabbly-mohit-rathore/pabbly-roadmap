// ============================================================
// EMBED WIDGET CONTROLLER
//
// Admin-only CRUD for embeddable feedback widgets + one PUBLIC
// endpoint used by the widget script on customer sites to fetch
// its config by token.
// ============================================================

const crypto = require('crypto');
const prisma = require('../config/database');

function requireAdmin(req, res) {
  if (req.user.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Only admins can manage embed widgets.' });
    return false;
  }
  return true;
}

function generateToken() {
  // 24-char url-safe token: enough entropy, easy to copy
  return crypto.randomBytes(18).toString('base64url');
}

function sanitize(body) {
  // Whitelist the fields clients can set — never trust the raw body
  const fields = [
    'name', 'type', 'openFrom', 'theme', 'accentColor', 'widgetWidth',
    'hideDefaultTrigger', 'disableExpansion', 'customTrigger', 'customTriggerSelector',
    'modules', 'boardIds', 'submissionBoardId',
    'showSubmissionFormOnly', 'suggestSimilarPosts', 'hideBoardSelection',
    'isActive',
  ];
  const data = {};
  for (const f of fields) if (body[f] !== undefined) data[f] = body[f];

  if (data.type && !['modal', 'popover'].includes(data.type)) {
    throw new Error('Invalid type — must be "modal" or "popover".');
  }
  if (data.openFrom && !['left', 'right', 'top', 'bottom'].includes(data.openFrom)) {
    throw new Error('Invalid openFrom — must be left, right, top, or bottom.');
  }
  if (data.theme && !['light', 'dark'].includes(data.theme)) {
    throw new Error('Invalid theme — must be "light" or "dark".');
  }
  if (data.accentColor && !/^#[0-9a-fA-F]{6}$/.test(data.accentColor)) {
    throw new Error('Invalid accent color — must be a 6-digit hex.');
  }
  if (data.widgetWidth !== undefined && data.widgetWidth !== null) {
    const n = parseInt(data.widgetWidth, 10);
    if (Number.isNaN(n) || n < 200 || n > 1200) throw new Error('Widget width must be between 200 and 1200 px.');
    data.widgetWidth = n;
  }
  return data;
}

// List all widgets (admin)
const getWidgets = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const widgets = await prisma.embedWidget.findMany({
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    res.json({ success: true, data: { widgets } });
  } catch (err) { next(err); }
};

// Get one widget (admin) — for editor
const getWidget = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const widget = await prisma.embedWidget.findUnique({
      where: { id: req.params.id },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    if (!widget) return res.status(404).json({ success: false, message: 'Widget not found.' });
    res.json({ success: true, data: { widget } });
  } catch (err) { next(err); }
};

// Create widget (admin)
const createWidget = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const body = sanitize(req.body);
    if (!body.name || !body.name.trim()) {
      return res.status(400).json({ success: false, message: 'Widget name is required.' });
    }

    const widget = await prisma.embedWidget.create({
      data: {
        ...body,
        name: body.name.trim(),
        token: generateToken(),
        createdById: req.user.userId,
      },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    res.status(201).json({ success: true, message: 'Widget created.', data: { widget } });
  } catch (err) {
    if (err.message && err.message.startsWith('Invalid')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// Update widget (admin)
const updateWidget = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const existing = await prisma.embedWidget.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Widget not found.' });

    const body = sanitize(req.body);
    const widget = await prisma.embedWidget.update({
      where: { id: req.params.id },
      data: body,
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    res.json({ success: true, message: 'Widget updated.', data: { widget } });
  } catch (err) {
    if (err.message && err.message.startsWith('Invalid')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// Delete widget (admin)
const deleteWidget = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const existing = await prisma.embedWidget.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Widget not found.' });
    await prisma.embedWidget.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Widget deleted.' });
  } catch (err) { next(err); }
};

// Toggle active (admin)
const toggleWidget = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const existing = await prisma.embedWidget.findUnique({ where: { id: req.params.id }, select: { isActive: true } });
    if (!existing) return res.status(404).json({ success: false, message: 'Widget not found.' });
    const widget = await prisma.embedWidget.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    res.json({ success: true, message: `Widget ${widget.isActive ? 'activated' : 'deactivated'}.`, data: { widget } });
  } catch (err) { next(err); }
};

// PUBLIC — widget script on customer sites calls this with ?token=xxx
const getPublicConfig = async (req, res, next) => {
  try {
    const { token } = req.params;
    const widget = await prisma.embedWidget.findUnique({
      where: { token },
      select: {
        id: true, name: true, type: true, openFrom: true, theme: true,
        accentColor: true, widgetWidth: true, hideDefaultTrigger: true,
        disableExpansion: true, modules: true, boardIds: true,
        submissionBoardId: true, showSubmissionFormOnly: true,
        suggestSimilarPosts: true, hideBoardSelection: true, isActive: true,
      },
    });

    if (!widget || !widget.isActive) {
      return res.status(404).json({ success: false, message: 'Widget not found or inactive.' });
    }

    res.json({ success: true, data: { widget } });
  } catch (err) { next(err); }
};

module.exports = {
  getWidgets,
  getWidget,
  createWidget,
  updateWidget,
  deleteWidget,
  toggleWidget,
  getPublicConfig,
};
