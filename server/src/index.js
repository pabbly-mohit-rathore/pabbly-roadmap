// ============================================================
// MAIN SERVER FILE
//
// Ye file sab kuch connect karti hai:
//   1. Express app banao
//   2. Middleware lagao (cors, helmet, morgan, json)
//   3. Routes connect karo
//   4. Error handler lagao (sabse last mein)
//   5. Server start karo
// ============================================================

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth.routes');
const boardRoutes = require('./routes/board.routes');
const postRoutes = require('./routes/post.routes');
const commentRoutes = require('./routes/comment.routes');
const voteRoutes = require('./routes/vote.routes');
const tagRoutes = require('./routes/tag.routes');
const boardMemberRoutes = require('./routes/boardMember.routes');
const inviteLinkRoutes = require('./routes/inviteLink.routes');
const adminDashboardRoutes = require('./routes/adminDashboard.routes');
const userManagementRoutes = require('./routes/userManagement.routes');
const quickResponseRoutes = require('./routes/quickResponse.routes');
const roadmapRoutes = require('./routes/roadmap.routes');
const activityLogRoutes = require('./routes/activityLog.routes');
const changelogRoutes = require('./routes/changelog.routes');
const reportingRoutes = require('./routes/reporting.routes');
const teamMemberRoutes = require('./routes/teamMember.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ──────────────────────────────────────
// MIDDLEWARE (har request pe chalte hain)
// ──────────────────────────────────────

// CORS — frontend ko allow karo server se baat karne ke liye
app.use(cors({
  origin: [
    "http://localhost:5173",
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true
}));

// JSON — request body ko JSON format mein parse karo
app.use(express.json({ limit: '50mb' }));

// ──────────────────────────────────────
// ROUTES — kaunsa URL kahan jayega
// ──────────────────────────────────────

// Health check — server chal raha hai ya nahi
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Auth routes — /api/auth/register, /api/auth/login, etc.
app.use('/api/auth', authRoutes);

// Board routes — /api/boards, /api/boards/:slug, etc.
app.use('/api/boards', boardRoutes);

// Post routes — /api/posts, /api/posts/:slug, etc.
app.use('/api/posts', postRoutes);

// Comment routes — /api/comments/post/:postId, etc.
app.use('/api/comments', commentRoutes);

// Vote routes — /api/votes/:postId, etc.
app.use('/api/votes', voteRoutes);

// Tag routes — /api/tags?boardId=xxx, etc.
app.use('/api/tags', tagRoutes);

// Board Member routes — /api/boards/:boardId/members, /api/members/boards, etc.
app.use('/api', boardMemberRoutes);

// Invite Link routes — /api/invite-links, /api/boards/:boardId/invite-links, etc.
app.use('/api', inviteLinkRoutes);

// Admin Dashboard routes — /api/admin/dashboard/stats, /api/admin/dashboard/top-posts, etc.
app.use('/api', adminDashboardRoutes);

// User Management routes — /api/admin/users, /api/admin/users/:userId, etc.
app.use('/api', userManagementRoutes);

// Quick Response routes — /api/quick-responses, etc.
app.use('/api', quickResponseRoutes);

// Roadmap routes — /api/roadmap, etc.
app.use('/api', roadmapRoutes);

// Activity Log routes — /api/activity-log, etc.
app.use('/api', activityLogRoutes);

// Changelog routes — /api/changelog, /api/changelog/public, etc.
app.use('/api', changelogRoutes);

// Reporting routes — /api/reporting/*, etc.
app.use('/api', reportingRoutes);

// Team Member routes — /api/team-members/*, etc.
app.use('/api', teamMemberRoutes);

// ──────────────────────────────────────
// ERROR HANDLER (sabse last mein lagta hai)
// Koi bhi error aaye toh ye pakad leta hai
// ──────────────────────────────────────
app.use(errorHandler);

// ──────────────────────────────────────
// SERVER START
// ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
