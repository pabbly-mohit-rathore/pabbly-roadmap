const rateLimit = require('express-rate-limit');

// General API limiter — catch-all for authenticated APIs
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 120,                   // 120 requests/minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  skip: (req) => req.path === '/health',
});

// Strict auth limiter — protects login/register from brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                    // 20 attempts / 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts. Try again in 15 minutes.' },
  skipSuccessfulRequests: true,
});

// Write-heavy endpoints limiter — posts, comments, votes
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 30,                    // 30 writes/minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many write requests. Please slow down.' },
});

// Upload limiter — avatar/image uploads
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10 minutes
  max: 10,                    // 10 uploads / 10 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many uploads. Try again later.' },
});

module.exports = { apiLimiter, authLimiter, writeLimiter, uploadLimiter };
