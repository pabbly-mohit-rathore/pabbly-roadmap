// ============================================================
// MAGIC-LINK TOKEN
//
// Signed short-lived JWT embedded in email links. When recipient
// clicks "View in Roadmap", the frontend exchanges this token for
// a fresh login session — so the recipient is ALWAYS signed in as
// themselves, even if a different user is currently logged in on
// that browser.
//
// Validity: 2 hours (long enough for users to open email,
// short enough to limit impersonation risk).
// ============================================================

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const EXPIRY = '2h';
const PURPOSE = 'magic-link';

function issueMagicToken(userId) {
  if (!SECRET) return null;
  try {
    return jwt.sign({ userId, purpose: PURPOSE }, SECRET, { expiresIn: EXPIRY });
  } catch (err) {
    console.error('[magicToken] issue failed:', err.message);
    return null;
  }
}

function verifyMagicToken(token) {
  if (!SECRET || !token) return null;
  try {
    const decoded = jwt.verify(token, SECRET);
    if (decoded && decoded.purpose === PURPOSE && decoded.userId) {
      return { userId: decoded.userId };
    }
    return null;
  } catch (err) {
    return null;
  }
}

module.exports = { issueMagicToken, verifyMagicToken };
