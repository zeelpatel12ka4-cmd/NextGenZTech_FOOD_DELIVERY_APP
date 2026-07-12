const rateLimit = require('express-rate-limit');

// Limits login and signup attempts (max 20 per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 20, 
  message: {
    message: 'Too many auth requests from this IP address. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Limits OTP generation requests to prevent SMS spam billing costs (max 5 per hour)
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 5, 
  message: {
    message: 'Too many verification code requests. Please try again in an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  authLimiter,
  otpLimiter
};
