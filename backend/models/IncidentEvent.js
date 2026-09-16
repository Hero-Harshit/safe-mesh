const mongoose = require('mongoose');

const incidentEventSchema = new mongoose.Schema({
  incidentId: { type: String, required: true, index: true },
  emergencyId: { type: String, required: true, index: true },
  guardianId: { type: String, required: true, index: true },
  eventType: { type: String, required: true },
  detectedAt: { type: Date, required: true, index: true },
  rssi: { type: Number, required: true },
  proximity: { 
    type: String, 
    enum: ['immediate', 'near', 'far', 'unknown'],
    required: true
  },
  location: {
    area: { type: String },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  appVersion: { type: String },
  timeBucket: { type: Number, required: true }, // Epoch time divided by X seconds for deduplication
  
  // TTL Index for retention (e.g., automatically delete after 30 days)
  // Configurable in production, hardcoded here for Phase 1. 30 days = 2592000 seconds
  createdAt: { type: Date, default: Date.now, index: { expires: '30d' } } 
});

// Compound unique index for deduplication: same incident, same guardian, same 10-second window
incidentEventSchema.index({ incidentId: 1, guardianId: 1, timeBucket: 1 }, { unique: true });

module.exports = mongoose.model('IncidentEvent', incidentEventSchema);
