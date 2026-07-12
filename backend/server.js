const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');

// Import Schemas
const User = require('./models/User');
const Address = require('./models/Address');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');
const ChatMessage = require('./models/ChatMessage');
const ApiKey = require('./models/ApiKey');

// Import routes
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const paymentsRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');

// Load environment variables
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/modest_restaurant';
mongoose.connect(mongoUri)
  .then(() => {
    console.log('[DATABASE-MONGO]: Connected to MongoDB successfully.');
    seedDatabase();
  })
  .catch(err => {
    console.error('[DATABASE-MONGO-ERROR]: MongoDB Connection failed:', err.message);
  });

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true // Crucial for HttpOnly cookies dispatching
}));
app.use(express.json());
app.use(cookieParser()); // Crucial to parse access cookies

// Bind routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);

// Create HTTP Server & Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Registry mapping orderId -> socket connections
const activeSockets = new Map();

io.on('connection', (socket) => {
  const orderId = socket.handshake.query.orderId;

  if (orderId) {
    socket.join(orderId);
    console.log(`[SOCKET-IO]: Connected client listening to order #${orderId}`);
  }

  // Admin dashboard joins global admin channel
  const isAdmin = socket.handshake.query.admin;
  if (isAdmin === 'true') {
    socket.join('admin-channel');
    console.log('[SOCKET-IO]: Admin client registered to admin-channel.');
  }

  socket.on('disconnect', () => {
    console.log('[SOCKET-IO]: Client disconnected.');
  });
});

// Broadcast status changes
global.broadcastOrderStatus = (orderId, statusData) => {
  io.to(orderId.toString()).emit('STATUS_UPDATE', { orderId, data: statusData });
};

// Broadcast chat messages
global.broadcastChatMessage = (orderId, chatMsg) => {
  io.to(orderId.toString()).emit('NEW_CHAT_MESSAGE', { orderId, data: chatMsg });
};

// Broadcast new order notifications to admin channel with sound alerts metadata
global.broadcastNewOrderAlert = (order) => {
  io.to('admin-channel').emit('NEW_ORDER_ALERT', order);
};

// --- Real-time Order Stepper Simulator ---
class OrderSimulator {
  constructor() {
    this.activeOrders = new Map();
    this.deliveryPartners = ['Raju Prasad', 'Amit Sharma', 'Vikram Singh', 'Deepak Kumar'];
    setInterval(() => this.tick(), 15000); // Progress check every 15 seconds
  }

  registerOrder(orderId) {
    const idStr = orderId.toString();
    console.log(`[SIMULATOR]: Registered Order #${idStr}`);
    this.activeOrders.set(idStr, {
      step: 1, // 1: preparing, 2: out_for_delivery, 3: delivered
      lastUpdated: Date.now(),
      deliveryPartner: this.deliveryPartners[Math.floor(Math.random() * this.deliveryPartners.length)]
    });
  }

  async tick() {
    const now = Date.now();
    for (const [orderId, state] of this.activeOrders.entries()) {
      try {
        const order = await Order.findById(orderId);
        if (!order || order.status === 'cancelled' || order.status === 'delivered') {
          this.activeOrders.delete(orderId);
          continue;
        }

        // Wait 15s between steps
        if (now - state.lastUpdated >= 15000) {
          state.step += 1;
          state.lastUpdated = now;

          let newStatus = 'preparing';
          let updateData = {};

          if (state.step === 2) {
            newStatus = 'out_for_delivery';
            order.deliveryPartnerName = state.deliveryPartner;
            order.estimatedDeliveryTime = 15;
            updateData = {
              status: newStatus,
              delivery_partner_name: state.deliveryPartner,
              estimated_delivery_time: 15
            };
          } else if (state.step === 3) {
            newStatus = 'delivered';
            order.paymentStatus = 'paid';
            order.estimatedDeliveryTime = 0;
            updateData = { status: newStatus, estimated_delivery_time: 0 };
            this.activeOrders.delete(orderId);
          }

          order.status = newStatus;
          order.updatedAt = new Date();
          await order.save();

          global.broadcastOrderStatus(orderId, updateData);
          console.log(`[SIMULATOR]: Updated Order #${orderId} to status: ${newStatus}`);

          if (newStatus === 'out_for_delivery') {
            const msg = `Namaste! I'm ${state.deliveryPartner}, your delivery partner for this order. I have picked up your hot food from The Modest Restaurant and am on my way!`;
            const chatMsg = new ChatMessage({
              orderId,
              senderRole: 'delivery_partner',
              message: msg
            });
            await chatMsg.save();
            global.broadcastChatMessage(orderId, chatMsg);
          }
        }
      } catch (err) {
        console.error(`[SIMULATOR-ERROR]: Tick failed for order: ${orderId}`, err.message);
        this.activeOrders.delete(orderId);
      }
    }
  }

  async handleCustomerMessage(orderId, message) {
    const state = this.activeOrders.get(orderId.toString());
    if (!state) return;

    setTimeout(async () => {
      const msgLower = message.toLowerCase();
      let reply = '';

      if (msgLower.includes('spicy') || msgLower.includes('sauce') || msgLower.includes('chutney') || msgLower.includes('spoon')) {
        reply = `Sure! I'll ask the kitchen staff to double check those customizations.`;
      } else if (msgLower.includes('where') || msgLower.includes('location') || msgLower.includes('reach') || msgLower.includes('time')) {
        reply = `I am riding safely. I should reach your location in about 8-10 minutes.`;
      } else if (msgLower.includes('gate') || msgLower.includes('door') || msgLower.includes('security') || msgLower.includes('guard')) {
        reply = `Understood. I will drop the package at security as instructed.`;
      } else if (msgLower.includes('thank') || msgLower.includes('ok') || msgLower.includes('okay')) {
        reply = `You're welcome! Please keep your phone nearby.`;
      } else {
        reply = `Received. Heading to your address now!`;
      }

      try {
        const chatMsg = new ChatMessage({
          orderId,
          senderRole: 'delivery_partner',
          message: reply
        });
        await chatMsg.save();
        global.broadcastChatMessage(orderId, chatMsg);
      } catch (err) {
        console.error(err);
      }
    }, 2500);
  }
}

global.orderSimulator = new OrderSimulator();

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', MERN: true });
});

// --- MongoDB Database Seeding Logic ---
async function seedDatabase() {
  try {
    // 1. Seed Users
    const usersCount = await User.countDocuments({});
    if (usersCount === 0) {
      console.log('[SEEDS]: Seeding users...');
      const adminHash = bcrypt.hashSync('admin123', 8);
      const managerHash = bcrypt.hashSync('manager123', 8);
      const kitchenHash = bcrypt.hashSync('kitchen123', 8);
      const customerHash = bcrypt.hashSync('customer123', 8);

      const admin = new User({ name: 'System Admin', email: 'admin@modest.com', phone: '9876543210', passwordHash: adminHash, role: 'admin' });
      const manager = new User({ name: 'Store Manager', email: 'manager@modest.com', phone: '9876543211', passwordHash: managerHash, role: 'manager' });
      const chef = new User({ name: 'Chef Rahul', email: 'kitchen@modest.com', phone: '9876543212', passwordHash: kitchenHash, role: 'kitchen_staff' });
      const customer = new User({ name: 'Aarav Mehta', email: 'customer@gmail.com', phone: '9876543213', passwordHash: customerHash, role: 'customer' });

      await admin.save();
      await manager.save();
      await chef.save();
      await customer.save();

      // Seed Address for Customer
      const addr = new Address({
        userId: customer._id,
        addressLine: 'Flat 402, Royal Residency, Andheri West',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400053',
        isDefault: true
      });
      await addr.save();
    }

    // 2. Seed Menu Items
    const menuCount = await MenuItem.countDocuments({});
    if (menuCount === 0) {
      console.log('[SEEDS]: Seeding menu items...');
      const defaultCustomization = [{ title: 'Spice Level', options: ['Mild', 'Medium', 'Hot'] }];
      const breadCustomization = [{ title: 'Butter', options: ['With Butter', 'Without Butter'] }];
      const drinkCustomization = [{ title: 'Sugar', options: ['Normal Sugar', 'Less Sugar', 'No Sugar'] }];

      const items = [
        { name: 'Paneer Tikka', description: 'Spiced cottage cheese cubes cooked in tandoor with onions and bell peppers.', price: 280, imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600', category: 'Starters', isVeg: true, customizationOptions: defaultCustomization },
        { name: 'Chicken Tikka Kabab', description: 'Tender boneless chicken marinated in yogurt and Indian spices, grilled to perfection.', price: 340, imageUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600', category: 'Starters', isVeg: false, customizationOptions: defaultCustomization },
        { name: 'Vegetable Samosa', description: 'Crispy pastry filled with spiced potatoes and green peas. Served with mint chutney.', price: 120, imageUrl: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=600', category: 'Starters', isVeg: true },
        { name: 'Butter Chicken', description: 'Smoked chicken cooked in a rich, creamy tomato butter gravy.', price: 390, imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600', category: 'Main Course', isVeg: false, customizationOptions: defaultCustomization },
        { name: 'Paneer Butter Masala', description: 'Soft cottage cheese cubes simmered in a luscious tomato, cashew, and butter gravy.', price: 320, imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600', category: 'Main Course', isVeg: true, customizationOptions: defaultCustomization },
        { name: 'Dal Makhani', description: 'Slow-cooked black lentils finished with cream and premium butter.', price: 260, imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600', category: 'Main Course', isVeg: true, customizationOptions: defaultCustomization },
        { name: 'Butter Naan', description: 'Leavened flatbread cooked in tandoor and brushed generously with butter.', price: 60, imageUrl: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=600', category: 'Breads', isVeg: true, customizationOptions: breadCustomization },
        { name: 'Garlic Naan', description: 'Soft Naan infused with minced garlic and baked in clay oven.', price: 80, imageUrl: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=600', category: 'Breads', isVeg: true, customizationOptions: breadCustomization },
        { name: 'Gulab Jamun', description: 'Golden fried milk balls dipped in warm cardamom syrup.', price: 100, imageUrl: 'https://images.unsplash.com/photo-1589135306090-e5774a67b6d9?w=600', category: 'Desserts', isVeg: true },
        { name: 'Mango Lassi', description: 'Chilled creamy yogurt blended with mango pulp.', price: 90, imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=600', category: 'Beverages', isVeg: true, customizationOptions: drinkCustomization }
      ];

      await MenuItem.insertMany(items);
    }

    // 3. Seed API Keys (Encrypted)
    const keysCount = await ApiKey.countDocuments({});
    if (keysCount === 0) {
      console.log('[SEEDS]: Seeding encrypted integrations keys...');
      const { encrypt } = require('./utils/encryption');
      const zomatoEncrypted = encrypt('ZOMATO_SANDBOX_KEY_89104');
      const swiggyEncrypted = encrypt('SWIGGY_SANDBOX_KEY_28491');
      const razorpayEncrypted = encrypt('RAZORPAY_SANDBOX_KEY_ID_842:RAZORPAY_SANDBOX_SECRET_2910');

      await ApiKey.insertMany([
        { service: 'zomato', apiKey: zomatoEncrypted, status: 'active' },
        { service: 'swiggy', apiKey: swiggyEncrypted, status: 'active' },
        { service: 'razorpay', apiKey: razorpayEncrypted, status: 'active' }
      ]);
    }
  } catch (err) {
    console.error('[SEEDS-ERROR]: DB Seeding failed:', err.message);
  }
}

// Start HTTP + Socket.IO Server
server.listen(port, () => {
  console.log(`[SERVER-PROD]: Backend listening on port ${port}`);
});
// Nodemon refresh trigger comment v11
