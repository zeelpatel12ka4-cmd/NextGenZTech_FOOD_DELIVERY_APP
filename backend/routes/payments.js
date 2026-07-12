const express = require('express');
const router = express.Router();
const { PaymentProvider } = require('../utils/payments');
const Order = require('../models/Order');

// Create Razorpay Checkout Transaction Order
router.post('/razorpay-order', async (req, res) => {
  const { orderId, amount } = req.body;

  if (!orderId || !amount) {
    return res.status(400).json({ message: 'OrderId and amount are required.' });
  }

  try {
    const razorpayOrder = await PaymentProvider.createOrder(orderId, amount);
    res.json(razorpayOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Razorpay webhook receiver (Uses raw buffer parsing strictly for signature matching)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.body.toString();

  const isValid = await PaymentProvider.verifyWebhook(rawBody, signature);
  if (!isValid) {
    console.warn('[WEBHOOK-PAYMENTS-ALERT]: Received payment webhook with invalid signature header.');
    return res.status(400).json({ message: 'Webhook signature verification failed.' });
  }

  try {
    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log(`[WEBHOOK-PAYMENTS-EVENT]: Event received: ${event}`);

    // Capture payment success
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      // Find order associated with the Razorpay order ID
      const order = await Order.findOne({ 'paymentDetails.razorpay_order_id': razorpayOrderId });
      if (order) {
        if (order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          order.status = 'preparing';
          order.paymentDetails = {
            ...(order.paymentDetails || {}),
            razorpay_payment_id: paymentId
          };
          order.updatedAt = new Date();
          await order.save();

          console.log(`[WEBHOOK-PAYMENTS-CONFIRMED]: Updated Order #ORD${order._id} to PAID / PREPARING.`);

          // Broadcast real-time Socket.IO status change
          if (global.broadcastOrderStatus) {
            global.broadcastOrderStatus(order._id.toString(), { 
              status: 'preparing',
              estimated_delivery_time: 35
            });
          }

          // Register in the live simulator to run stepper
          if (global.orderSimulator) {
            global.orderSimulator.registerOrder(order._id);
          }
        }
      } else {
        console.warn(`[WEBHOOK-PAYMENTS-MISMATCH]: Received payment hook for unknown order code: ${razorpayOrderId}`);
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[WEBHOOK-PAYMENTS-ERROR]: Webhook failed:', error.message);
    res.status(500).json({ message: 'Webhook processing failed.' });
  }
});

// Signature verification callback
router.post('/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
    return res.status(400).json({ message: 'Missing signature verification tokens.' });
  }

  try {
    const { decrypt } = require('../utils/encryption');
    const ApiKey = require('../models/ApiKey');
    const crypto = require('crypto');

    // Load keys dynamically
    const record = await ApiKey.findOne({ service: 'razorpay', status: 'active' });
    let secret = process.env.RAZORPAY_KEY_SECRET;
    if (record && record.apiKey) {
      const decryptedRaw = decrypt(record.apiKey);
      if (decryptedRaw && decryptedRaw.includes(':') && !decryptedRaw.includes('DECRYPTION ERROR') && !decryptedRaw.startsWith('RAZORPAY_SANDBOX_KEY_ID_842')) {
        secret = decryptedRaw.split(':')[1];
      }
    }

    const payload = razorpay_order_id + '|' + razorpay_payment_id;
    const generatedSignature = crypto
      .createHmac('sha256', secret || 'e9YS50M2FOMYTe1s5J3PgLy7')
      .update(payload)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.warn('[SIGNATURE-VERIFICATION-FAILED]: Mismatched signatures:', generatedSignature, razorpay_signature);
      return res.status(400).json({ message: 'Signature mismatch.' });
    }

    // Update order status
    const order = await Order.findById(orderId);
    if (order) {
      order.paymentStatus = 'paid';
      order.status = 'preparing';
      order.paymentDetails = {
        ...(order.paymentDetails || {}),
        razorpay_payment_id,
        razorpay_signature,
        razorpay_order_id
      };
      order.updatedAt = new Date();
      await order.save();

      // Trigger simulator
      if (global.orderSimulator) {
        global.orderSimulator.registerOrder(order._id);
      }

      // Broadcast order progress alert
      if (global.broadcastOrderStatus) {
        global.broadcastOrderStatus(order._id.toString(), { 
          status: 'preparing',
          estimated_delivery_time: 35
        });
      }
      
      // Notify admin dashboard
      if (global.broadcastNewOrderAlert) {
        global.broadcastNewOrderAlert(order);
      }
    }

    res.json({ success: true, message: 'Payment verified successfully.' });
  } catch (error) {
    console.error('[SIGNATURE-VERIFICATION-ERROR]:', error.message);
    res.status(500).json({ message: 'Signature verification processing failed.' });
  }
});

module.exports = router;
