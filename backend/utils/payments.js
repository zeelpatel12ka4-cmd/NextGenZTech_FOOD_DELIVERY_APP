const Razorpay = require('razorpay');
const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');
const { decrypt } = require('./encryption');

class PaymentProvider {
  async createOrder(orderId, amount) {
    throw new Error('createOrder method must be implemented by payment adapters.');
  }

  async verifyWebhook(payload, signature) {
    throw new Error('verifyWebhook signature method must be implemented by payment adapters.');
  }
}

class RazorpayPaymentProvider extends PaymentProvider {
  constructor() {
    super();
    this.razorpayClient = null;
  }

  // Load credentials dynamically from encrypted DB settings or fall back to env
  async initClient() {
    try {
      const record = await ApiKey.findOne({ service: 'razorpay', status: 'active' });
      let keyId = process.env.RAZORPAY_KEY_ID;
      let keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (record && record.apiKey) {
        // Keys are saved encrypted as "KEY_ID:KEY_SECRET"
        const decryptedRaw = decrypt(record.apiKey);
        if (decryptedRaw && decryptedRaw.includes(':') && !decryptedRaw.includes('DECRYPTION ERROR') && !decryptedRaw.startsWith('RAZORPAY_SANDBOX_KEY_ID_842')) {
          const parts = decryptedRaw.split(':');
          keyId = parts[0];
          keySecret = parts[1];
          console.log('[PAYMENTS-PROVIDER]: Razorpay live credentials loaded from database integration panel.');
        }
      }

      if (keyId && keySecret) {
        this.razorpayClient = new Razorpay({
          key_id: keyId,
          key_secret: keySecret
        });
      } else {
        console.warn('[PAYMENTS-PROVIDER]: No Razorpay API credentials configured. Operating in MOCK checkout fallback mode.');
        this.razorpayClient = null;
      }
    } catch (err) {
      console.error('[PAYMENTS-PROVIDER]: Error loading Razorpay config:', err.message);
      this.razorpayClient = null;
    }
  }

  async createOrder(orderId, amount) {
    await this.initClient();

    // Convert amount to paisa (INR subunit)
    const amountInPaisa = Math.round(amount * 100);

    if (!this.razorpayClient) {
      // Mock gateway output
      console.log(`[MOCK-GATEWAY-ORDERS]: Generated transaction order reference for #${orderId} (Total: ₹${amount})`);
      return {
        id: `pay_mock_order_${Math.random().toString(36).substring(2, 9)}`,
        amount: amountInPaisa,
        currency: 'INR',
        receipt: `receipt_${orderId}`,
        isMock: true
      };
    }

    try {
      const order = await this.razorpayClient.orders.create({
        amount: amountInPaisa,
        currency: 'INR',
        receipt: `receipt_order_${orderId}`,
        notes: { orderId: orderId.toString() }
      });
      return order;
    } catch (error) {
      console.error('[RAZORPAY-CLIENT-ERROR] Failed to compile order details:', error);
      throw new Error('Razorpay transaction order failed to compile.');
    }
  }

  async verifyWebhook(rawPayloadString, signatureHeader) {
    await this.initClient();
    
    let webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'modest_webhook_secret_key';

    // If active keys in DB, we could look for a custom webhook secret, otherwise environment secret
    if (!this.razorpayClient) {
      // Mock verifier
      console.log('[MOCK-GATEWAY-WEBHOOK]: Verified mock sandbox signature header.');
      return true;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawPayloadString)
        .digest('hex');

      return expectedSignature === signatureHeader;
    } catch (err) {
      console.error('[RAZORPAY-SIGNATURE-VERIFICATION-FAILED]:', err.message);
      return false;
    }
  }
}

class StripePaymentProvider extends PaymentProvider {
  async createOrder(orderId, amount) {
    console.log('[STRIPE-ADAPTER-STUB]: Card order checkout created in Stripe sandbox.');
    return { id: `stripe_order_stub_${orderId}`, amount, currency: 'INR', gateway: 'stripe' };
  }

  async verifyWebhook(payload, signature) {
    return true; // Stripe webhook stub verification
  }
}

// Instantiate default active Razorpay provider
const providerInstance = new RazorpayPaymentProvider();

module.exports = {
  PaymentProvider: providerInstance,
  StripePaymentProvider: new StripePaymentProvider()
};
