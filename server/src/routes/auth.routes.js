// ============================================================
// AUTH ROUTES
//
// Ye file URLs define karti hai — kaunsa URL aaye toh kya karo
//
// Flow: User request bhejta hai → Route match hota hai
//       → Middleware check karta hai → Controller logic chalata hai
//
// Example:
//   POST /api/auth/register → validate → register controller
//   POST /api/auth/login    → validate → login controller
//   GET  /api/auth/profile  → authenticate → getProfile controller
// ============================================================

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  googleLogin,
  uploadAvatarHandler,
} = require('../controllers/auth.controller');
const { uploadAvatar } = require('../middleware/upload');

// ──────────────────────────────────────
// Validation Rules
// Ye "body" function check karta hai ki request body mein
// kya aaya hai — sahi hai ya nahi
// ──────────────────────────────────────

const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.'),
  body('email')
    .isEmail().withMessage('Please enter a valid email.')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain a number.'),
];

const loginRules = [
  body('email')
    .isEmail().withMessage('Please enter a valid email.')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .notEmpty().withMessage('Password is required.'),
];

const changePasswordRules = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required.'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain a number.'),
];

const forgotPasswordRules = [
  body('email')
    .isEmail().withMessage('Please enter a valid email.')
    .normalizeEmail({ gmail_remove_dots: false }),
];

const resetPasswordRules = [
  body('token')
    .notEmpty().withMessage('Reset token is required.'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain a number.'),
];

// ──────────────────────────────────────
// Routes
//
// Public routes (login nahi chahiye):
//   POST /register    → naya account banao
//   POST /login       → login karo, token lo
//   POST /refresh-token → naya access token lo
//
// Protected routes (login chahiye):
//   GET  /profile          → apni profile dekho
//   PUT  /profile          → profile edit karo
//   PUT  /change-password  → password badlo
// ──────────────────────────────────────

// Public
router.post('/register', registerRules, validate, register);
router.post('/login', loginRules, validate, login);
router.post('/google', googleLogin);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPasswordRules, validate, forgotPassword);
router.post('/reset-password', resetPasswordRules, validate, resetPassword);

// Protected — authenticate middleware pehle chalega
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePasswordRules, validate, changePassword);
router.post('/upload-avatar', authenticate, uploadAvatar.single('avatar'), uploadAvatarHandler);

module.exports = router;
