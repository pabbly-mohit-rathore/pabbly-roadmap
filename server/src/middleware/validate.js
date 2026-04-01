// ============================================================
// VALIDATION MIDDLEWARE
//
// Ye check karta hai ki user ne form sahi bhara hai ya nahi
// PEHLE ye route mein lagta hai, PHIR controller chalta hai
//
// Example flow:
//   Route: POST /auth/register
//   → pehle registerRules check karo (email valid? password 8+ chars?)
//   → agar sab sahi hai → controller chale
//   → agar galat hai → 400 error bhejo with details
//
// Ye "express-validator" library use karta hai
// ============================================================

const { validationResult } = require('express-validator');

// Ye function validation ka result check karta hai
// Agar koi error hai toh 400 status ke saath errors bhej deta hai
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Pehla error ka message bhejo — user ko ek clear message mile
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }

  // Sab sahi hai — aage jaao (controller tak)
  next();
};

module.exports = validate;
