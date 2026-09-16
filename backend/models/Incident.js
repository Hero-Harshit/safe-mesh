const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  incidentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  emergencyId: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'ended'],
    default: 'active',
    index: true
  },
  sender: {
    safehelpId: { type: String, required: true },
    location: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  detectionSummary: {
    totalGuardians: { type: Number, default: 0 },
    firstDetectedAt: { type: Date, default: null },
    lastDetectedAt: { type: Date, default: null },
    uniqueGuardians: [{ type: String }] // Used internally to track unique guardians accurately
  },
  createdAt: { type: Date, default: Date.now, index: true },
  endedAt: { type: Date, default: null }
});

module.exports = mongoose.model('Incident', incidentSchema);
