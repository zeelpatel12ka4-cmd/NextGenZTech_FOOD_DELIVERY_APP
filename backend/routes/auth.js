const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Address = require('../models/Address');
const { SECRET_KEY, authMiddleware } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');

// Helper to set cookie
const setAccessCookie = (res, token) => {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });
};

// Customer Registration
router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email address is already in use.' });
    }

    const hash = bcrypt.hashSync(password, 8);
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash: hash,
      role: 'customer'
    });

    await newUser.save();

    const tokenUser = { id: newUser._id, name: newUser.name, email: newUser.email, phone: newUser.phone, role: newUser.role };
    const token = jwt.sign(tokenUser, SECRET_KEY, { expiresIn: '24h' });

    setAccessCookie(res, token);
    res.status(201).json({ user: tokenUser });
  } catch (error) {
    res.status(500).json({ message: 'Error registering account.', error: error.message });
  }
});

// Customer Authentication
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.role !== 'customer') {
      return res.status(400).json({ message: 'Invalid credentials or account role mismatch.' });
    }

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const tokenUser = { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role };
    const token = jwt.sign(tokenUser, SECRET_KEY, { expiresIn: '24h' });

    setAccessCookie(res, token);
    res.json({ user: tokenUser });
  } catch (error) {
    res.status(500).json({ message: 'Error authenticating.', error: error.message });
  }
});

// Staff Authentication
router.post('/staff-login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.role === 'customer') {
      return res.status(400).json({ message: 'Access Denied: Administrative credentials required.' });
    }

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const tokenUser = { id: user._id, name: user.name, email: user.email, role: user.role };
    const token = jwt.sign(tokenUser, SECRET_KEY, { expiresIn: '24h' });

    setAccessCookie(res, token);
    res.json({ user: tokenUser });
  } catch (error) {
    res.status(500).json({ message: 'Error authenticating staff.', error: error.message });
  }
});

// Clear Cookies / Terminate Session
router.post('/logout', (req, res) => {
  res.clearCookie('access_token');
  res.json({ message: 'Logged out successfully.' });
});

// Get Current User Profile (httpOnly session read)
router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

// SMS OTP Simulation Registry (IP -> OTP Code)
const activeOtps = new Map();

// Request SMS OTP (Rate-limited to prevent carrier SMS billing abuse)
router.post('/send-otp', otpLimiter, (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required.' });
  }

  // Generate 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const clientIp = req.ip;

  activeOtps.set(clientIp, { code, phone, timestamp: Date.now() });

  // PRINTING TO SERVER CONSOLE (PRODUCTION SIMULATOR LOGS)
  console.log(`[SMS-GATEWAY-MSG91-SIMULATOR]: Verification SMS dispatched to +91 ${phone}. OTP Code: ${code}`);

  res.json({ message: `Verification code successfully sent to +91 ${phone.slice(0,2)}******${phone.slice(-2)}.` });
});

// Verify SMS OTP
router.post('/verify-otp', (req, res) => {
  const { otp } = req.body;
  const clientIp = req.ip;

  const record = activeOtps.get(clientIp);

  if (!record) {
    return res.status(400).json({ message: 'OTP expired or no code was generated for this session.' });
  }

  // Expire codes after 5 minutes
  if (Date.now() - record.timestamp > 5 * 60 * 1000) {
    activeOtps.delete(clientIp);
    return res.status(400).json({ message: 'OTP has expired. Please request a new code.' });
  }

  if (record.code !== otp) {
    return res.status(400).json({ message: 'Invalid verification code.' });
  }

  // Verification success
  activeOtps.delete(clientIp);
  res.json({ success: true, message: 'Phone number verified successfully.' });
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    const hash = bcrypt.hashSync(newPassword, 8);
    user.passwordHash = hash;
    await user.save();

    res.json({ message: 'Password has been successfully updated.' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating password.' });
  }
});

// --- Synchronized Cart Persistence ---

// Retrieve Cart state
router.get('/cart', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('cart.menuItemId');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Format output array
    const cartItems = user.cart.map(item => {
      if (!item.menuItemId) return null;
      return {
        id: item.menuItemId._id,
        name: item.menuItemId.name,
        price: item.menuItemId.price,
        imageUrl: item.menuItemId.imageUrl,
        isVeg: item.menuItemId.isVeg,
        quantity: item.quantity,
        customizations: item.customizations ? Object.fromEntries(item.customizations) : {}
      };
    }).filter(Boolean);

    res.json(cartItems);
  } catch (error) {
    res.status(500).json({ message: 'Error loading persistent cart.' });
  }
});

// Update/Save Cart state (Overwrites user cart in MongoDB)
router.post('/cart', authMiddleware, async (req, res) => {
  try {
    const { cart } = req.body; // array of: { id, quantity, customizations }
    if (!Array.isArray(cart)) {
      return res.status(400).json({ message: 'Cart list must be an array.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Reformat into schema fields
    user.cart = cart.map(item => ({
      menuItemId: item.id,
      quantity: item.quantity,
      customizations: item.customizations || {}
    }));

    await user.save();
    res.json({ message: 'Cart persisted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error saving cart.', error: error.message });
  }
});

module.exports = router;
