const mongoose = require('mongoose');

const OAuthStateSchema = new mongoose.Schema({
  state: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // Automatically delete after 10 minutes
  }
});

module.exports = mongoose.model('OAuthState', OAuthStateSchema);
