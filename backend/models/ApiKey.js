const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ApiKeySchema = new Schema({
  service: { type: String, required: true, unique: true, enum: ['zomato', 'swiggy', 'razorpay'] },
  apiKey: { type: String, required: true }, // Symmetric encrypted token
  status: { type: String, required: true, enum: ['active', 'revoked'], default: 'active' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ApiKey', ApiKeySchema);
