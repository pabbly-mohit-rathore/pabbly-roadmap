// ============================================================
// COMMENT ROUTES
//
// Routes:
//   GET    /post/:postId              → Get all comments for a post
//   POST   /post/:postId              → Add comment
//   PUT    /:id                       → Update comment
//   DELETE /:id                       → Delete comment
//   PUT    /:id/official              → Mark as official response
//   PUT    /:id/internal              → Mark as internal note
// ============================================================

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { uploadCommentAttachment } = require('../middleware/upload');

// Multer errors (size too large / invalid mime) must return JSON
function handleUploadError(err, req, res, next) {
  if (!err) return next();
  const msg = err && err.message ? err.message : 'Upload failed.';
  return res.status(400).json({ success: false, message: msg });
}

const {
  getComments,
  addComment,
  updateComment,
  deleteComment,
  markAsOfficial,
  markAsInternal,
  toggleCommentPin,
  toggleCommentLike,
} = require('../controllers/comment.controller');

// ──────────────────────────────────────
// Validation Rules
// ──────────────────────────────────────

// Content may be empty when an attachment is the only payload — the
// controller enforces "content OR attachment" so validation here just
// caps size and validates parent UUID.
const addCommentRules = [
  body('content')
    .optional({ checkFalsy: true })
    .isLength({ max: 500000 }).withMessage('Comment content is too large.'),
  body('parentId')
    .optional({ checkFalsy: true })
    .isUUID().withMessage('Parent comment ID must be a valid UUID.'),
];

const updateCommentRules = [
  body('content')
    .optional({ checkFalsy: true })
    .isLength({ max: 500000 }).withMessage('Comment content is too large.'),
];

const postIdParamRules = [
  param('postId')
    .isUUID().withMessage('Post ID must be a valid UUID.'),
];

const commentIdParamRules = [
  param('id')
    .isUUID().withMessage('Comment ID must be a valid UUID.'),
];

// ──────────────────────────────────────
// Routes
// ──────────────────────────────────────

// GET /post/:postId — Get all comments for a post (public but with optional auth)
router.get('/post/:postId', authenticate, postIdParamRules, validate, getComments);

// POST /post/:postId — Add comment to post (authenticated)
// Multer must run BEFORE validators so multipart body text fields are parsed.
router.post(
  '/post/:postId',
  authenticate,
  (req, res, next) => {
    uploadCommentAttachment.single('attachment')(req, res, (err) => handleUploadError(err, req, res, next));
  },
  postIdParamRules,
  addCommentRules,
  validate,
  addComment
);

// PUT /:id — Update comment (authenticated)
router.put(
  '/:id',
  authenticate,
  (req, res, next) => {
    uploadCommentAttachment.single('attachment')(req, res, (err) => handleUploadError(err, req, res, next));
  },
  commentIdParamRules,
  updateCommentRules,
  validate,
  updateComment
);

// DELETE /:id — Delete comment (authenticated)
router.delete('/:id', authenticate, commentIdParamRules, validate, deleteComment);

// PUT /:id/official — Mark as official response (admin/manager)
router.put(
  '/:id/official',
  authenticate,
  commentIdParamRules,
  validate,
  markAsOfficial
);

// PUT /:id/internal — Mark as internal note (admin/manager)
router.put(
  '/:id/internal',
  authenticate,
  commentIdParamRules,
  validate,
  markAsInternal
);

// PUT /:id/pin — Toggle pin status (admin/manager)
router.put(
  '/:id/pin',
  authenticate,
  commentIdParamRules,
  validate,
  toggleCommentPin
);

// POST /:id/like — Like/unlike comment (authenticated)
router.post(
  '/:id/like',
  authenticate,
  commentIdParamRules,
  validate,
  toggleCommentLike
);

module.exports = router;
