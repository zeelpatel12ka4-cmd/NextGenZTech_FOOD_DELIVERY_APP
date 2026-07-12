const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  phone: { type: String },
  passwordHash: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: ['admin', 'manager', 'kitchen_staff', 'customer'], 
    default: 'customer',
    index: true
  },
  cart: [{
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
    quantity: { type: Number, default: 1 },
    customizations: { type: Map, of: String }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
