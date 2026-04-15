// ============================================================
// AUTH MIDDLEWARE
//
// Ye check karta hai ki user LOGGED IN hai ya nahi
// Kaise? JWT token check karke jo frontend har request ke
// saath header mein bhejta hai
//
// JWT Token kya hai?
// - Jab user login karta hai, server ek "pass" (token) deta hai
// - Ye token mein user ki info hoti hai (id, role)
// - Har next request mein user ye token header mein bhejta hai
// - Server token check karta hai — valid hai toh access milta hai
//
// 2 functions hain:
// 1. authenticate → ZARURI hai login hona (e.g., post create)
// 2. optionalAuth → Login optional hai (e.g., posts dekhna)
// ============================================================

const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

// ──────────────────────────────────────
// 1. AUTHENTICATE — Login zaruri hai
//    Ye un routes pe lagta hai jahan login hona MUST hai
//    Example: POST /api/posts (post banane ke liye login chahiye)
// ──────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    // Step 1: Header se token nikalo
    // Frontend bhejta hai: { Authorization: "Bearer xyz123token" }
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // "Bearer xyz123token" → sirf "xyz123token" nikalo
    const token = authHeader.split(' ')[1];

    // Step 2: Token verify karo — kya ye valid hai?
    // jwt.verify token ko decode karta hai aur check karta hai
    // ki ye hamari SECRET_KEY se bana tha ya nahi
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Step 3: Database se user dhundho
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated.',
      });
    }

    // Step 4: User ko request mein attach karo
    // Ab controller mein req.user se user ki info mil jayegi
    req.user = {
      ...user,
      userId: user.id, // userId ke liye id use karo
    };

    // Step 5: Team access check — agar header mein board ID hai toh
    // verify karo ki user us board ka member hai
    const teamBoardId = req.headers['x-team-board-id'];
    if (teamBoardId && user.role !== 'admin') {
      const boardMember = await prisma.boardMember.findUnique({
        where: { userId_boardId: { userId: user.id, boardId: teamBoardId } },
      });
      if (boardMember) {
        req.user.teamAccess = {
          boardId: teamBoardId,
          accessLevel: boardMember.accessLevel, // 'admin' or 'manager'
          canDeletePost: boardMember.accessLevel === 'admin',
          canDeleteComment: boardMember.accessLevel === 'admin',
          canDeleteBoard: boardMember.accessLevel === 'admin',
        };
      }
    }

    // Aage jaao — controller tak
    next();
  } catch (error) {
    // Token expired ya invalid hai
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

// ──────────────────────────────────────
// 2. OPTIONAL AUTH — Login optional hai
//    Ye un routes pe lagta hai jahan login ke bina bhi access ho
//    Example: GET /api/posts (posts dekh sakte ho bina login ke)
//    Agar logged in hai toh req.user set hoga, nahi toh null
// ──────────────────────────────────────
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Token nahi hai — koi baat nahi, bina login ke jaane do
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    req.user = user ? { ...user, userId: user.id } : null;
    next();
  } catch (error) {
    // Token galat hai — ignore karo, bina login jaane do
    req.user = null;
    next();
  }
};

// ──────────────────────────────────────
// 3. IS ADMIN — Sirf admin ko allow karo
//    Ye authenticate ke BAAD lagta hai
//    Example: DELETE /api/boards/:id (sirf admin board delete kar sakta hai)
// ──────────────────────────────────────
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.',
    });
  }
  next();
};

module.exports = { authenticate, optionalAuth, isAdmin };
