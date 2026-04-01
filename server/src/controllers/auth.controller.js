// ============================================================
// AUTH CONTROLLER
//
// Ye file LOGIN aur REGISTER ka actual logic hai
// Yahan hota hai:
//   - Password hash karna (bcrypt)
//   - Token banana (JWT)
//   - Database mein user save/find karna (Prisma)
//
// Flow:
//   Route → validate.js → YE FILE → Response
// ============================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

// ──────────────────────────────────────
// Helper: Token generate karo
// Ye function 2 jagah use hoga — register aur login dono mein
// ──────────────────────────────────────
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { userId, role },           // Token mein ye data jayega
    process.env.JWT_SECRET,     // Secret key se sign hoga
    { expiresIn: '7d' }        // 7 din baad expire hoga
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }       // 30 din baad expire
  );
};

// ============================================================
// 1. REGISTER — Naya user banao
//
// Frontend se aayega: { name, email, password }
// Server karega:
//   1. Check karo email pehle se toh nahi hai
//   2. Password ko hash karo (plain text save nahi karte!)
//   3. Database mein user save karo
//   4. Token banao aur bhej do
// ============================================================
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Step 1: Kya email pehle se registered hai?
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered.',
      });
    }

    // Step 2: Password hash karo
    // "Admin@123" → "$2a$12$LJ3m5..." (unreadable string)
    // Kyun? Agar database hack ho jaye toh bhi password safe rahe
    // 12 = salt rounds (jitna zyada, utna secure but slow)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Step 3: Database mein naya user banao
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,  // Hashed password save hoga, plain nahi
      },
    });

    // Step 4: Tokens banao
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Step 5: Response bhejo
    // Password response mein NAHI bhejte — security ke liye
    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);  // errorHandler.js handle karega
  }
};

// ============================================================
// 2. LOGIN — Existing user login kare
//
// Frontend se aayega: { email, password }
// Server karega:
//   1. Email se user dhundho
//   2. Password match karo (bcrypt.compare)
//   3. Token banao aur bhej do
// ============================================================
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Step 1: Email se user dhundho
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Step 2: Kya user banned toh nahi hai?
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated.',
      });
    }

    // Step 3: Password match karo
    // bcrypt.compare plain password ko hashed password se compare karta hai
    // "Admin@123" vs "$2a$12$LJ3m5..." → true ya false
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Step 4: Tokens banao
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Step 5: Response bhejo
    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. REFRESH TOKEN — Naya access token lo purane refresh token se
//
// Jab access token expire ho jaye (7 din baad), toh user ko
// dubara login nahi karna padega — refresh token se naya access
// token mil jayega
// ============================================================
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.',
      });
    }

    // Refresh token verify karo
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    // User dhundho
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token.',
      });
    }

    // Naya access token banao
    const newAccessToken = generateAccessToken(user.id, user.role);

    res.json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token.',
    });
  }
};

// ============================================================
// 4. GET PROFILE — Apni profile dekho
//
// Ye authenticate middleware ke BAAD chalta hai
// req.user already set hoga middleware ne
// ============================================================
const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 5. UPDATE PROFILE — Apni profile edit karo (name, phone, avatar)
// ============================================================
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, phone, avatar },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
      },
    });

    res.json({
      success: true,
      message: 'Profile updated.',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 6. CHANGE PASSWORD — Purana password verify karke naya set karo
// ============================================================
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Current user ka password fetch karo
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    // Purana password match karo
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    // Naya password hash karke save karo
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
};
