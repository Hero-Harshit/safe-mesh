const mongoose = require('mongoose');

const UberConnectionSchema = new mongoose.Schema({
  provider: {
    type: String,
    default: 'uber',
    required: true
  },
  environment: {
    type: String,
    default: 'sandbox',
    required: true
  },
  providerUserId: {
    type: String,
  },
  accessTokenEncrypted: {
    type: String,
    required: true
  },
  refreshTokenEncrypted: {
    type: String,
  },
  tokenExpiresAt: {
    type: Date,
    required: true
  },
  scopes: [{
    type: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('UberConnection', UberConnectionSchema);
