const express = require('express');
const router = express.Router();
const Address = require('../models/Address');
const Order = require('../models/Order');
const ChatMessage = require('../models/ChatMessage');
const MenuItem = require('../models/MenuItem');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Get saved user addresses
router.get('/addresses', authMiddleware, async (req, res) => {
  try {
    const list = await Address.find({ userId: req.user.id }).sort({ isDefault: -1, createdAt: -1 });
    // Map _id to id for frontend compatibility
    const formatted = list.map(addr => ({
      id: addr._id,
      user_id: addr.userId,
      address_line: addr.addressLine,
      city: addr.city,
      state: addr.state,
      postal_code: addr.postalCode,
      is_default: addr.isDefault ? 1 : 0
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving addresses.' });
  }
});

// Add new address
router.post('/addresses', authMiddleware, async (req, res) => {
  const { address_line, city, state, postal_code, is_default } = req.body;

  if (!address_line || !city || !state || !postal_code) {
    return res.status(400).json({ message: 'All address fields are required.' });
  }

  const setAsDefault = Boolean(is_default);

  try {
    if (setAsDefault) {
      // Clear previous defaults
      await Address.updateMany({ userId: req.user.id }, { isDefault: false });
    }

    const newAddr = new Address({
      userId: req.user.id,
      addressLine: address_line,
      city,
      state,
      postalCode: postal_code,
      isDefault: setAsDefault
    });

    await newAddr.save();

    res.status(201).json({
      id: newAddr._id,
      user_id: newAddr.userId,
      address_line: newAddr.addressLine,
      city: newAddr.city,
      state: newAddr.state,
      postal_code: newAddr.postalCode,
      is_default: newAddr.isDefault ? 1 : 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error saving address.' });
  }
});

// Place new order
router.post('/', authMiddleware, async (req, res) => {
  const { 
    address_id, address_line, city, state, postal_code, 
    payment_method, payment_status, payment_details, items, discount, grand_total 
  } = req.body;

  if (!payment_method || !items || items.length === 0 || !grand_total) {
    return res.status(400).json({ message: 'Missing order details.' });
  }

  try {
    let targetAddressId = address_id;

    // Create address if inline values were sent
    if (!targetAddressId && address_line && city && state && postal_code) {
      const inlineAddr = new Address({
        userId: req.user.id,
        addressLine: address_line,
        city,
        state,
        postalCode: postal_code,
        isDefault: false
      });
      await inlineAddr.save();
      targetAddressId = inlineAddr._id;
    }

    if (!targetAddressId) {
      return res.status(400).json({ message: 'Delivery address is required.' });
    }

    // Double check item pricing
    let itemTotal = 0;
    const formattedItems = [];

    for (const item of items) {
      const mongoose = require('mongoose');
      if (!item.id || !mongoose.Types.ObjectId.isValid(item.id)) {
        return res.status(400).json({ message: 'Your cart contains items from an outdated session. Please empty your cart and add them again.' });
      }
      const dbItem = await MenuItem.findById(item.id);
      if (!dbItem) {
        return res.status(400).json({ message: `Item not found: ${item.name}` });
      }
      itemTotal += dbItem.price * item.quantity;
      formattedItems.push({
        menuItemId: dbItem._id,
        quantity: item.quantity,
        price: dbItem.price,
        customizations: item.customizations || {}
      });
    }

    const tax = Math.round((itemTotal * 0.05) * 100) / 100;
    const deliveryFee = payment_method === 'COD' ? 40 : 30;
    const calculatedTotal = Math.round((itemTotal + tax + deliveryFee - (discount || 0)) * 100) / 100;

    const finalPaymentStatus = payment_method === 'COD' ? 'pending' : (payment_status || 'paid');
    const finalStatus = finalPaymentStatus === 'paid' ? 'preparing' : 'pending';

    const newOrder = new Order({
      userId: req.user.id,
      addressId: targetAddressId,
      status: finalStatus,
      paymentMethod: payment_method,
      paymentStatus: finalPaymentStatus,
      paymentDetails: payment_details || {},
      items: formattedItems,
      itemTotal,
      tax,
      deliveryFee,
      discount: discount || 0,
      grandTotal: calculatedTotal,
      estimatedDeliveryTime: 35
    });

    await newOrder.save();

    // Trigger simulator if payment went through immediately (e.g. COD or mock Card pay)
    if (finalStatus === 'preparing' && global.orderSimulator) {
      global.orderSimulator.registerOrder(newOrder._id);
    }

    // Trigger sound alerts / visual warnings on dashboard
    if (global.broadcastNewOrderAlert) {
      global.broadcastNewOrderAlert(newOrder);
    }

    res.status(201).json({
      id: newOrder._id,
      status: newOrder.status,
      grand_total: newOrder.grandTotal,
      estimated_delivery_time: newOrder.estimatedDeliveryTime
    });
  } catch (error) {
    console.error('[ORDERS-POST-ERROR]:', error);
    res.status(500).json({ message: 'Error placing order.', error: error.message });
  }
});

// Retrieve order histories (Customers filter by user_id, Staff query all)
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const isCustomer = req.user.role === 'customer';
    const filter = isCustomer ? { userId: req.user.id } : {};

    const list = await Order.find(filter)
      .populate('userId', 'name email phone')
      .populate('addressId')
      .sort({ createdAt: -1 });

    const formatted = list.map(o => ({
      id: o._id,
      user_id: o.userId ? o.userId._id : null,
      customer_name: o.userId ? o.userId.name : 'Unknown User',
      customer_phone: o.userId ? o.userId.phone : '',
      address_line: o.addressId ? o.addressId.addressLine : '',
      city: o.addressId ? o.addressId.city : '',
      state: o.addressId ? o.addressId.state : '',
      postal_code: o.addressId ? o.addressId.postalCode : '',
      status: o.status,
      payment_method: o.paymentMethod,
      payment_status: o.paymentStatus,
      grand_total: o.grandTotal,
      delivery_partner_name: o.deliveryPartnerName,
      estimated_delivery_time: o.estimatedDeliveryTime,
      created_at: o.createdAt
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Error loading order histories.', error: error.message });
  }
});

// Retrieve detailed order information (Includes items lists and chats logs)
router.get('/:id', authMiddleware, async (req, res) => {
  const orderId = req.params.id;

  try {
    const order = await Order.findById(orderId)
      .populate('userId', 'name phone email')
      .populate('addressId')
      .populate('items.menuItemId');

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Auth gate check
    if (req.user.role === 'customer' && order.userId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Format fields
    const formattedOrder = {
      id: order._id,
      user_id: order.userId._id,
      customer_name: order.userId.name,
      customer_phone: order.userId.phone,
      address_line: order.addressId ? order.addressId.addressLine : '',
      city: order.addressId ? order.addressId.city : '',
      state: order.addressId ? order.addressId.state : '',
      postal_code: order.addressId ? order.addressId.postalCode : '',
      status: order.status,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      payment_details: order.paymentDetails,
      item_total: order.itemTotal,
      tax: order.tax,
      delivery_fee: order.deliveryFee,
      discount: order.discount,
      grand_total: order.grandTotal,
      delivery_partner_name: order.deliveryPartnerName,
      estimated_delivery_time: order.estimatedDeliveryTime,
      created_at: order.createdAt
    };

    const formattedItems = order.items.map(item => ({
      id: item.menuItemId ? item.menuItemId._id : null,
      name: item.menuItemId ? item.menuItemId.name : 'Unknown Dish',
      price: item.price,
      quantity: item.quantity,
      is_veg: item.menuItemId ? item.menuItemId.isVeg : true,
      image_url: item.menuItemId ? item.menuItemId.imageUrl : '',
      customizations: item.customizations ? Object.fromEntries(item.customizations) : {}
    }));

    const chatLogs = await ChatMessage.find({ orderId }).sort({ createdAt: 1 });

    res.json({
      order: formattedOrder,
      items: formattedItems,
      chat: chatLogs
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving order details.', error: error.message });
  }
});

// Update order status (Accessible by staff/admin)
router.patch('/:id/status', authMiddleware, requireRole(['admin', 'manager', 'kitchen_staff']), async (req, res) => {
  const orderId = req.params.id;
  const { status, delivery_partner_name, estimated_delivery_time } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Status is required.' });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    order.status = status;
    order.updatedAt = new Date();

    if (delivery_partner_name !== undefined) {
      order.deliveryPartnerName = delivery_partner_name;
    }
    if (estimated_delivery_time !== undefined) {
      order.estimatedDeliveryTime = estimated_delivery_time;
    }
    if (status === 'delivered') {
      order.paymentStatus = 'paid';
    }

    await order.save();

    // Trigger status broadcast through Socket.IO
    if (global.broadcastOrderStatus) {
      global.broadcastOrderStatus(orderId, { 
        status, 
        delivery_partner_name: order.deliveryPartnerName, 
        estimated_delivery_time: order.estimatedDeliveryTime 
      });
    }

    res.json({ message: `Order status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ message: 'Error updating status.' });
  }
});

// Cancel Order
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  const orderId = req.params.id;

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    // Validate access
    if (req.user.role === 'customer' && order.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Cancellation guard
    if (order.status !== 'pending' && order.status !== 'preparing') {
      return res.status(400).json({ message: 'Order cannot be cancelled as it is already en route.' });
    }

    order.status = 'cancelled';
    order.updatedAt = new Date();
    await order.save();

    // Trigger status broadcast through Socket.IO
    if (global.broadcastOrderStatus) {
      global.broadcastOrderStatus(orderId, { status: 'cancelled' });
    }

    res.json({ message: 'Order successfully cancelled.' });
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling order.' });
  }
});

// Send Chat Message
router.post('/:id/chat', authMiddleware, async (req, res) => {
  const orderId = req.params.id;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ message: 'Message cannot be empty.' });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    // Validate access
    if (req.user.role === 'customer' && order.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const senderRole = req.user.role === 'customer' ? 'customer' : 'delivery_partner';

    const newMsg = new ChatMessage({
      orderId,
      senderRole,
      message
    });

    await newMsg.save();

    // Broadcast live chat through Socket.IO
    if (global.broadcastChatMessage) {
      global.broadcastChatMessage(orderId, newMsg);
    }

    // Trigger simulator reply if customer wrote
    if (senderRole === 'customer' && global.orderSimulator) {
      global.orderSimulator.handleCustomerMessage(orderId, message);
    }

    res.status(201).json(newMsg);
  } catch (error) {
    res.status(500).json({ message: 'Error sending message.' });
  }
});

module.exports = router;
