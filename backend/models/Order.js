const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  addressId: { type: Schema.Types.ObjectId, ref: 'Address', required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'], 
    default: 'pending',
    index: true 
  },
  paymentMethod: { type: String, required: true, enum: ['UPI', 'Card', 'COD'] },
  paymentStatus: { type: String, required: true, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paymentDetails: { type: Schema.Types.Mixed },
  items: [{
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    customizations: { type: Map, of: String }
  }],
  itemTotal: { type: Number, required: true },
  tax: { type: Number, required: true },
  deliveryFee: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  deliveryPartnerName: { type: String },
  estimatedDeliveryTime: { type: Number, default: 35 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
