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
    const hashedPassword = await bcrypt.hash(password, 12);

    // Step 3: Database mein naya user banao (always 'user' role via registration)
    const validRole = 'user';
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,  // Hashed password save hoga, plain nahi
        role: validRole,
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

    // Step 3: Check if this is a Google-only account
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'This account uses Google sign-in. Please continue with Google.',
      });
    }

    // Step 4: Password match karo
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
        isActive: true,
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

// ============================================================
// 7. FORGOT PASSWORD — Password reset token generate karo
//
// Email verify karke ek reset token banao aur bhej do
// Frontend use karega token ko reset password endpoint mein
// ============================================================
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Email se user dhundho
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Security: Same message whether user exists or not
      return res.status(200).json({
        success: true,
        message: 'If email exists, reset link will be sent.',
      });
    }

    // Purana reset tokens ko expire kar do (same email ke liye)
    await prisma.passwordResetToken.deleteMany({
      where: {
        email,
        used: false,
        expiresAt: { lt: new Date() },
      },
    });

    // Naya reset token banao (32 character random string)
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Token ko database mein save karo (1 hour validity)
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        email,
        expiresAt: tokenExpiry,
      },
    });

    // TODO: Email bhejne ka code yahan aayega
    // For now, sirf token response mein de rahe hain (development only)
    // Production mein, email service se email bhejenge reset link ke saath

    res.json({
      success: true,
      message: 'If email exists, reset link will be sent.',
      // Dev only - remove in production:
      data: {
        resetToken, // Frontend test ke liye temporary
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 8. RESET PASSWORD — Reset token use karke password change karo
//
// Token verify karo aur naya password set karo
// ============================================================
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    // Reset token dhundho aur valid check karo
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.used) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token.',
      });
    }

    // Check if token has expired
    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired.',
      });
    }

    // User dhundho
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Naya password hash karo aur save karo
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Reset token ko "used" mark karo
    await prisma.passwordResetToken.update({
      where: { token },
      data: { used: true },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'updated',
        description: 'Password reset via forgot password',
        userId: user.id,
      },
    });

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 9. GOOGLE LOGIN — Google OAuth se login/register karo
//
// Frontend se aayega: { credential } (Google JWT token)
// Server karega:
//   1. Google token verify karo
//   2. User dhundho ya banao
//   3. Apna JWT token bhejo
// ============================================================
const googleLogin = async (req, res, next) => {
  try {
    const { accessToken: googleAccessToken } = req.body;

    if (!googleAccessToken) {
      return res.status(400).json({ success: false, message: 'Google access token is required.' });
    }

    // Google userinfo API se user ka data lo
    const axios = require('axios');
    let googleUser;
    try {
      const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });
      googleUser = data;
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid Google token.' });
    }

    const { sub: googleId, email, name, picture } = googleUser;

    // Pehle email ya googleId se user dhundho
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (user) {
      // Agar googleId nahi tha (email se registered tha) toh link karo
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, avatar: user.avatar || picture },
        });
      }
      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Your account has been deactivated.' });
      }
    } else {
      // Naya user banao (always 'user' role via Google OAuth)
      user = await prisma.user.create({
        data: {
          name,
          email,
          googleId,
          avatar: picture,
          role: 'user',
          emailVerified: true,
        },
      });
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

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
// UPLOAD AVATAR — Profile picture upload karo
// ============================================================
const fs = require('fs');
const path = require('path');

const uploadAvatarHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Delete old avatar file if exists
    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { avatar: true } });
    if (currentUser?.avatar && currentUser.avatar.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(__dirname, '../../', currentUser.avatar);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarUrl },
      select: { id: true, name: true, email: true, phone: true, avatar: true, role: true },
    });

    res.json({ success: true, message: 'Avatar updated.', data: { user } });
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
  forgotPassword,
  resetPassword,
  googleLogin,
  uploadAvatarHandler,
};
