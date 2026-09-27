const mongoose = require('mongoose');

const SafeRideSchema = new mongoose.Schema({
  providerUserId: {
    type: String,
    required: true
  },
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
  providerRideId: {
    type: String,
    required: true,
    unique: true
  },
  pickupLatitude: {
    type: Number,
    required: true
  },
  pickupLongitude: {
    type: Number,
    required: true
  },
  destinationLatitude: {
    type: Number,
    required: true
  },
  destinationLongitude: {
    type: Number,
    required: true
  },
  destinationName: {
    type: String
  },
  productId: {
    type: String
  },
  productName: {
    type: String
  },
  estimatedFare: {
    type: String
  },
  currency: {
    type: String
  },
  status: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SafeRide', SafeRideSchema);
