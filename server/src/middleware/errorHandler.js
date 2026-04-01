// ============================================================
// ERROR HANDLER MIDDLEWARE
//
// Ye SABSE LAST mein lagta hai — jab koi bhi error aaye
// poore server mein, ye usse pakad leta hai aur user ko
// ek clean JSON response bhejta hai (server crash nahi hota)
//
// Bina iske: Server crash ho jayega aur user ko ugly HTML error dikhega
// Iske saath: User ko clean { message: "Something went wrong" } milega
// ============================================================

const errorHandler = (err, req, res, next) => {
  // Error ki details console mein print karo (developer ke liye)
  console.error('Error:', err.message);

  // Status code set karo — agar pehle se set hai toh wahi use karo
  // Nahi toh default 500 (Internal Server Error)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};

module.exports = errorHandler;
