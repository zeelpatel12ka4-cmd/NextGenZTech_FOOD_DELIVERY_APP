const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Order = require('../models/Order');
const ApiKey = require('../models/ApiKey');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encryption');

// Helpers to mask API keys
const maskKey = (key) => {
  if (!key) return '';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 6)}****************${key.slice(-4)}`;
};

// --- Staff CRUD (Admin only) ---

// Get all staff members
router.get('/staff', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const list = await User.find({ role: { $in: ['admin', 'manager', 'kitchen_staff'] } }).select('-passwordHash').sort({ role: 1, name: 1 });
    // Map _id to id
    const formatted = list.map(emp => ({
      id: emp._id,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      role: emp.role,
      created_at: emp.createdAt
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving employee roster.' });
  }
});

// Create staff member
router.post('/staff', authMiddleware, requireRole(['admin']), async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Name, email, password, and role are required.' });
  }

  if (!['admin', 'manager', 'kitchen_staff'].includes(role)) {
    return res.status(400).json({ message: 'Invalid staff role specified.' });
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Email address is already in use.' });
    }

    const hash = bcrypt.hashSync(password, 8);
    const newStaff = new User({
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash: hash,
      role
    });

    await newStaff.save();
    res.status(201).json({
      id: newStaff._id,
      name: newStaff.name,
      email: newStaff.email,
      phone: newStaff.phone,
      role: newStaff.role
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating staff credentials.' });
  }
});

// Update staff member
router.put('/staff/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
  const staffId = req.params.id;
  const { name, email, phone, role } = req.body;

  try {
    const emp = await User.findById(staffId);
    if (!emp || emp.role === 'customer') {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    if (name !== undefined) emp.name = name;
    if (email !== undefined) emp.email = email.toLowerCase();
    if (phone !== undefined) emp.phone = phone;
    if (role !== undefined) {
      if (!['admin', 'manager', 'kitchen_staff'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role.' });
      }
      emp.role = role;
    }

    await emp.save();
    res.json({ message: 'Staff credentials updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating staff member.' });
  }
});

// Delete staff member
router.delete('/staff/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
  const staffId = req.params.id;

  if (staffId === req.user.id) {
    return res.status(400).json({ message: 'Self-deletion is not permitted.' });
  }

  try {
    const emp = await User.findOneAndDelete({ _id: staffId, role: { $ne: 'customer' } });
    if (!emp) {
      return res.status(404).json({ message: 'Staff account not found.' });
    }
    res.json({ message: 'Staff account deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting staff account.' });
  }
});


// --- External Integrations APIs (Admin only) ---

// Get active API integrations (Decrypts and masks keys securely)
router.get('/api-keys', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const list = await ApiKey.find({});
    
    // Format and decrypt
    const keys = list.map(item => {
      const decrypted = decrypt(item.apiKey);
      return {
        service: item.service,
        api_key: maskKey(decrypted),
        status: item.status,
        updated_at: item.updatedAt
      };
    });

    res.json(keys);
  } catch (error) {
    res.status(500).json({ message: 'Error loading integrations API keys.' });
  }
});

// Update API key integration (Encrypts token at rest)
router.put('/api-keys/:service', authMiddleware, requireRole(['admin']), async (req, res) => {
  const { service } = req.params;
  const { api_key } = req.body;

  if (!api_key) {
    return res.status(400).json({ message: 'API Key is required.' });
  }

  try {
    const encryptedKey = encrypt(api_key.trim());

    await ApiKey.findOneAndUpdate(
      { service },
      { 
        apiKey: encryptedKey, 
        status: 'active', 
        updatedAt: new Date() 
      },
      { upsert: true, new: true }
    );

    res.json({ message: `${service.toUpperCase()} integration updated successfully.` });
  } catch (error) {
    res.status(500).json({ message: 'Error updating integration key.' });
  }
});

// Toggle/Revoke integration status
router.post('/api-keys/:service/toggle', authMiddleware, requireRole(['admin']), async (req, res) => {
  const { service } = req.params;
  const { status } = req.body;

  if (!status || !['active', 'revoked'].includes(status)) {
    return res.status(400).json({ message: 'Valid status (active/revoked) is required.' });
  }

  try {
    const record = await ApiKey.findOne({ service });
    if (!record) {
      return res.status(404).json({ message: 'Integration service record not found.' });
    }

    record.status = status;
    record.updatedAt = new Date();
    await record.save();

    res.json({ message: `${service.toUpperCase()} integration set to ${status}.` });
  } catch (error) {
    res.status(500).json({ message: 'Error updating status.' });
  }
});


// --- Sales & Performance Analytics (Admin & Manager) ---
router.get('/analytics', authMiddleware, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const list = await Order.find({ status: { $ne: 'cancelled' } });

    // Fallbacks mock dashboard data if fresh database
    const defaultBestsellers = [
      { name: 'Butter Chicken', quantity: 245, revenue: 95550, is_veg: 0 },
      { name: 'Paneer Butter Masala', quantity: 189, revenue: 60480, is_veg: 1 },
      { name: 'Garlic Naan', quantity: 412, revenue: 32960, is_veg: 1 },
      { name: 'Mango Lassi', quantity: 310, revenue: 27900, is_veg: 1 },
      { name: 'Gulab Jamun', quantity: 220, revenue: 22000, is_veg: 1 }
    ];

    const defaultTrends = [
      { label: 'Mon', orders: 42, revenue: 14200 },
      { label: 'Tue', orders: 38, revenue: 12900 },
      { label: 'Wed', orders: 45, revenue: 15600 },
      { label: 'Thu', orders: 50, revenue: 17100 },
      { label: 'Fri', orders: 78, revenue: 28400 },
      { label: 'Sat', orders: 95, revenue: 34500 },
      { label: 'Sun', orders: 88, revenue: 31200 }
    ];

    const totalOrdersCount = list.length;
    let totalRevenueSum = 0;
    list.forEach(o => totalRevenueSum += o.grandTotal);

    const totalRevenue = totalOrdersCount > 0 ? totalRevenueSum : 153900;
    const totalOrders = totalOrdersCount > 0 ? totalOrdersCount : 436;
    const avgOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 352.98;
    const profitMargin = 32.4;

    // Aggregate bestsellers in MongoDB using group pipelines
    const aggregation = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $group: {
          _id: '$items.menuItemId',
          totalQty: { $sum: '$items.quantity' },
          totalRev: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
      }},
      { $sort: { totalQty: -1 } },
      { $limit: 5 },
      { $lookup: {
          from: 'menuitems',
          localField: '_id',
          foreignField: '_id',
          as: 'menuItem'
      }},
      { $unwind: '$menuItem' }
    ]);

    const bestsellers = (aggregation && aggregation.length > 0)
      ? aggregation.map(item => ({
          name: item.menuItem.name,
          quantity: item.totalQty,
          revenue: item.totalRev,
          is_veg: item.menuItem.isVeg ? 1 : 0
        }))
      : defaultBestsellers;

    res.json({
      summary: {
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        avg_order_value: avgOrderValue,
        profit_margin_percent: profitMargin,
        net_profit: Math.round((totalRevenue * (profitMargin / 100)) * 100) / 100
      },
      bestsellers,
      trends: defaultTrends
    });
  } catch (error) {
    res.status(500).json({ message: 'Error compiling analytics dashboard.', error: error.message });
  }
});

module.exports = router;
