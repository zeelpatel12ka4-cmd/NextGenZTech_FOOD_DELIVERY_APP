const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MenuItemSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  imageUrl: { type: String },
  category: { type: String, required: true, index: true },
  isVeg: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true, index: true },
  customizationOptions: [{
    title: String,
    options: [String]
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MenuItem', MenuItemSchema);
