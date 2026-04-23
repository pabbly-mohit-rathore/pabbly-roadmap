// ============================================================
// MAIN SERVER FILE
// ============================================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const errorHandler = require('./middleware/errorHandler');
const { apiLimiter, authLimiter, writeLimiter, uploadLimiter } = require('./middleware/rateLimiters');

const authRoutes = require('./routes/auth.routes');
const boardRoutes = require('./routes/board.routes');
const postRoutes = require('./routes/post.routes');
const commentRoutes = require('./routes/comment.routes');
const voteRoutes = require('./routes/vote.routes');
const tagRoutes = require('./routes/tag.routes');
const boardMemberRoutes = require('./routes/boardMember.routes');
const adminDashboardRoutes = require('./routes/adminDashboard.routes');
const userManagementRoutes = require('./routes/userManagement.routes');
const quickResponseRoutes = require('./routes/quickResponse.routes');
const roadmapRoutes = require('./routes/roadmap.routes');
const activityLogRoutes = require('./routes/activityLog.routes');
const changelogRoutes = require('./routes/changelog.routes');
const reportingRoutes = require('./routes/reporting.routes');
const teamMemberRoutes = require('./routes/teamMember.routes');

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy — required for rate-limiter to see real client IP behind load balancer/Render
app.set('trust proxy', 1);

// HTTP server + Socket.io setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", process.env.CLIENT_URL].filter(Boolean),
    credentials: true,
  },
  // Connection limits to prevent socket DoS
  maxHttpBufferSize: 1e6,     // 1 MB max message size
  pingTimeout: 30000,
  pingInterval: 25000,
});
app.set('io', io);

io.on('connection', (socket) => {
  socket.on('join-post', (postId) => {
    if (typeof postId === 'string' && postId.length <= 100) socket.join(`post:${postId}`);
  });
  socket.on('leave-post', (postId) => {
    if (typeof postId === 'string' && postId.length <= 100) socket.leave(`post:${postId}`);
  });
  socket.on('join-board', (boardId) => {
    if (typeof boardId === 'string' && boardId.length <= 100) socket.join(`board:${boardId}`);
  });
  socket.on('leave-board', (boardId) => {
    if (typeof boardId === 'string' && boardId.length <= 100) socket.leave(`board:${boardId}`);
  });
  // Global feed for cross-page live updates (vote counts on list pages, etc.)
  socket.on('join-feed', () => socket.join('feed'));
  socket.on('leave-feed', () => socket.leave('feed'));
});

// ──────────────────────────────────────
// SECURITY + PERFORMANCE MIDDLEWARE
// ──────────────────────────────────────

// Security headers (XSS, clickjacking, MIME sniffing, etc.)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow /uploads from client origin
}));

// Gzip compression — reduces response size by ~70% for JSON
app.use(compression());

// Permissive CORS specifically for the embed widget's public endpoints —
// third-party sites load widget.js and call these paths, so we can't lock
// down to a specific origin. Must run BEFORE the global origin-restricted
// cors() so preflight OPTIONS requests get the right headers.
// (cors() middleware handles preflight OPTIONS automatically — no need
// for a separate app.options() route, which breaks in path-to-regexp v8.)
const embedCors = cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] });
app.use('/api/embed-widgets/public', embedCors);

// CORS — rest of the API, origin-restricted
app.use(cors({
  origin: ["http://localhost:5173", process.env.CLIENT_URL].filter(Boolean),
  credentials: true,
  exposedHeaders: ['X-User-Banned']
}));

// Body parsers — reasonable limits (avatar uploads use multer, not JSON)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Static uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  immutable: false,
}));

// Public static files (embed widget runtime). Served with permissive CORS
// so third-party origins can load widget.js without issue.
app.use('/', express.static(path.join(__dirname, '../public'), {
  maxAge: '1h',
  setHeaders: function (res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  },
}));

// Health check (no rate limit)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Global API rate limit (applies to all /api/* routes)
app.use('/api', apiLimiter);

// ──────────────────────────────────────
// ROUTES
// ──────────────────────────────────────

// Auth — strict limiter on top of global
app.use('/api/auth', authLimiter, authRoutes);

// Write-heavy endpoints — extra limiter
app.use('/api/posts', writeLimiter, postRoutes);
app.use('/api/comments', writeLimiter, commentRoutes);
app.use('/api/votes', writeLimiter, voteRoutes);

// Others
app.use('/api/boards', boardRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api', boardMemberRoutes);
app.use('/api', adminDashboardRoutes);
app.use('/api', userManagementRoutes);
app.use('/api', quickResponseRoutes);
app.use('/api', roadmapRoutes);
app.use('/api', activityLogRoutes);
app.use('/api', changelogRoutes);
app.use('/api', reportingRoutes);
app.use('/api', teamMemberRoutes);

const subscriptionRoutes = require('./routes/subscription.routes');
app.use('/api/subscriptions', subscriptionRoutes);

const notificationRoutes = require('./routes/notification.routes');
app.use('/api/notifications', notificationRoutes);

const pushSubscriptionRoutes = require('./routes/pushSubscription.routes');
app.use('/api/push', pushSubscriptionRoutes);

const webhookRoutes = require('./routes/webhook.routes');
app.use('/api/webhooks', webhookRoutes);

const embedWidgetRoutes = require('./routes/embedWidget.routes');
app.use('/api/embed-widgets', embedWidgetRoutes);

// Expose upload limiter for routes that need it (auth/avatar)
app.locals.uploadLimiter = uploadLimiter;

// 404 for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Error handler (always last)
app.use(errorHandler);

// ──────────────────────────────────────
// CRASH PROTECTION
// ──────────────────────────────────────

// Never crash on unhandled promise rejection — log and continue
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

// Catch uncaught exceptions — log, then exit cleanly (process manager will restart)
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  // Give pending requests a moment to finish before exit
  setTimeout(() => process.exit(1), 1000);
});

// Graceful shutdown on SIGTERM (Docker/Render/PM2 sends this)
const shutdown = (signal) => {
  console.log(`[${signal}] received, shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  // Force exit if shutdown takes too long
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ──────────────────────────────────────
// SERVER START
// ──────────────────────────────────────
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
