// ============================================================
// EMBED WIDGET ROUTES
//
// Admin:
//   GET    /              → list all widgets
//   POST   /              → create
//   GET    /:id           → get one (for editor)
//   PUT    /:id           → update
//   DELETE /:id           → delete
//   POST   /:id/toggle    → flip isActive
//
// Public (no auth — called by embed script):
//   GET    /public/:token → widget config by token
// ============================================================

const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { uploadCommentAttachment } = require('../middleware/upload');
const {
  getWidgets,
  getWidget,
  createWidget,
  updateWidget,
  deleteWidget,
  toggleWidget,
  getPublicConfig,
  getPublicPosts,
  getPublicPost,
  togglePublicVote,
  submitPublicPost,
  getPublicComments,
  addPublicComment,
  togglePublicCommentLike,
  searchWidgetUsers,
} = require('../controllers/embedWidget.controller');

// Multer errors (file too large, invalid mimetype) must return JSON
// instead of being swallowed by the global error handler
function handleUploadError(err, req, res, next) {
  if (!err) return next();
  const msg = err && err.message ? err.message : 'Upload failed.';
  return res.status(400).json({ success: false, message: msg });
}

// Public — CORS mounted globally in index.js. Vote/submit/comment use
// optionalAuth: if the caller has a valid accessToken (e.g. embedded
// on the same origin where user is already logged in), we use the
// authenticated user and skip the email prompt.
router.get('/public/:token', getPublicConfig);
router.get('/public/:token/posts', getPublicPosts);
router.get('/public/:token/posts/:postId', getPublicPost);
router.get('/public/:token/posts/:postId/comments', optionalAuth, getPublicComments);
router.post('/public/:token/comments/:commentId/like', optionalAuth, togglePublicCommentLike);
router.get('/public/:token/users', searchWidgetUsers);
router.post(
  '/public/:token/posts/:postId/comments',
  optionalAuth,
  (req, res, next) => {
    uploadCommentAttachment.single('attachment')(req, res, (err) => handleUploadError(err, req, res, next));
  },
  addPublicComment
);
router.post('/public/:token/vote', optionalAuth, togglePublicVote);
router.post('/public/:token/submit', optionalAuth, submitPublicPost);

// Admin
router.get('/', authenticate, getWidgets);
router.post('/', authenticate, createWidget);
router.get('/:id', authenticate, getWidget);
router.put('/:id', authenticate, updateWidget);
router.delete('/:id', authenticate, deleteWidget);
router.post('/:id/toggle', authenticate, toggleWidget);

module.exports = router;
