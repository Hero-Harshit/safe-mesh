const mongoose = require('mongoose');

const BookingSessionSchema = new mongoose.Schema({
  providerUserId: {
    type: String,
    required: true
  },
  fareId: {
    type: String,
    required: true
  },
  productId: {
    type: String,
    required: true
  },
  pickup: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  destination: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    name: { type: String }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 1200 // Fares usually expire quickly. Let's auto-delete after 20 minutes.
  }
});

module.exports = mongoose.model('BookingSession', BookingSessionSchema);
