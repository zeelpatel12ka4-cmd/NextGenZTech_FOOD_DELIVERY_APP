const mongoose = require('mongoose');

// Export Mongoose Connection for backward compatibility
module.exports = mongoose.connection;
