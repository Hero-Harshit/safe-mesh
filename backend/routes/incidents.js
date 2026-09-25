const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');
const IncidentEvent = require('../models/IncidentEvent');

const mongoose = require('mongoose');
const isDbConnected = () => mongoose.connection.readyState === 1;

// In-memory fallback stores for demo / offline operation without MongoDB
const memoryIncidents = new Map();
const memoryIncidentEvents = [];

// POST /api/incidents - Start a new incident
router.post('/', async (req, res) => {
  try {
    const { emergencyId, sender, location, triggerSource } = req.body;
    const senderId = sender?.safemeshId || sender?.safehelpId || sender?.userId;

    if (!emergencyId || !sender || !senderId) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Missing required fields: emergencyId, sender.safemeshId (or safehelpId)'
      });
    }

    // Generate a unique server-side incident ID
    // Example: INC_YYYYMMDD_emergencyId
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const incidentId = `INC_${dateStr}_${emergencyId}_${Date.now()}`;

    if (isDbConnected()) {
      const incident = new Incident({
        incidentId,
        emergencyId,
        triggerSource: triggerSource || 'web',
        sender: {
          safehelpId: senderId,
          location: {
            latitude: location?.latitude,
            longitude: location?.longitude
          }
        }
      });
      await incident.save();
    } else {
      memoryIncidents.set(incidentId, {
        incidentId,
        emergencyId,
        status: 'active',
        sender: {
          safehelpId: senderId,
          location: {
            latitude: location?.latitude,
            longitude: location?.longitude
          }
        },
        detectionSummary: {
          totalGuardians: 0,
          firstDetectedAt: null,
          lastDetectedAt: null,
          uniqueGuardians: []
        },
        createdAt: new Date(),
        endedAt: null,
        triggerSource: triggerSource || 'web'
      });
      console.log(`SAFEMESH_INCIDENT: [in-memory] incident created ${incidentId}`);
    }

    console.log(`SAFEMESH_INCIDENT: incident created ${incidentId}`);

    res.json({
      success: true,
      incidentId
    });

  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to create incident'
    });
  }
});

// POST /api/incidents/:incidentId/events - Record a guardian detection
router.post('/:incidentId/events', async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { emergencyId, guardianId, detectedAt, rssi, proximity, location, appVersion } = req.body;

    if (!emergencyId || !guardianId || !detectedAt || rssi === undefined || !proximity) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_EVENT',
        message: 'Missing required event fields'
      });
    }

    // Validate coordinates if present
    if (location && location.latitude !== undefined && location.longitude !== undefined) {
      if (location.latitude < -90 || location.latitude > 90 || location.longitude < -180 || location.longitude > 180) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_EVENT',
          message: 'Invalid coordinates'
        });
      }
    }

    // 1. Find and verify incident
    if (!isDbConnected()) {
      const inc = memoryIncidents.get(incidentId);
      if (!inc) {
        return res.status(404).json({
          success: false,
          error: 'INCIDENT_NOT_FOUND',
          message: 'The requested incident does not exist.'
        });
      }
      if (inc.status !== 'active') {
        return res.status(400).json({
          success: false,
          error: 'INCIDENT_NOT_ACTIVE',
          message: 'This incident is no longer active.'
        });
      }
      if (inc.emergencyId !== emergencyId) {
        return res.status(400).json({
          success: false,
          error: 'EMERGENCY_ID_MISMATCH',
          message: 'The emergencyId does not match the incident.'
        });
      }
      if (!inc.detectionSummary.uniqueGuardians.includes(guardianId)) {
        inc.detectionSummary.uniqueGuardians.push(guardianId);
        inc.detectionSummary.totalGuardians = inc.detectionSummary.uniqueGuardians.length;
      }
      const detectedDate = new Date(detectedAt);
      if (!inc.detectionSummary.firstDetectedAt || detectedDate < new Date(inc.detectionSummary.firstDetectedAt)) {
        inc.detectionSummary.firstDetectedAt = detectedDate;
      }
      if (!inc.detectionSummary.lastDetectedAt || detectedDate > new Date(inc.detectionSummary.lastDetectedAt)) {
        inc.detectionSummary.lastDetectedAt = detectedDate;
      }
      const eventId = `mem_evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      memoryIncidentEvents.push({
        _id: eventId,
        incidentId,
        emergencyId,
        guardianId,
        eventType: 'guardian_detection',
        detectedAt: detectedDate,
        rssi,
        proximity,
        location,
        appVersion,
        createdAt: new Date()
      });
      return res.json({
        success: true,
        eventId
      });
    }

    const incident = await Incident.findOne({ incidentId });
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'INCIDENT_NOT_FOUND',
        message: 'The requested incident does not exist.'
      });
    }

    if (incident.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'INCIDENT_NOT_ACTIVE',
        message: 'This incident is no longer active.'
      });
    }

    if (incident.emergencyId !== emergencyId) {
      return res.status(400).json({
        success: false,
        error: 'EMERGENCY_ID_MISMATCH',
        message: 'The emergencyId does not match the incident.'
      });
    }

    // 2. Duplicate protection strategy (10-second window)
    const detectedTimestamp = new Date(detectedAt).getTime();
    const WINDOW_SECONDS = 10;
    const timeBucket = Math.floor(detectedTimestamp / (WINDOW_SECONDS * 1000));

    const event = new IncidentEvent({
      incidentId,
      emergencyId,
      guardianId,
      eventType: 'guardian_detection',
      detectedAt: new Date(detectedAt),
      rssi,
      proximity,
      location,
      appVersion,
      timeBucket
    });

    try {
      await event.save();
      console.log(`SAFEHELP_INCIDENT: guardian detection recorded for ${incidentId}`);
    } catch (dbError) {
      // 11000 is MongoDB's duplicate key error code
      if (dbError.code === 11000) {
        console.log(`SAFEHELP_INCIDENT: duplicate event ignored for guardian ${guardianId}`);
        // Return 200 OK so the client doesn't retry unnecessarily
        return res.json({
          success: true,
          eventId: 'duplicate_ignored'
        });
      }
      throw dbError; // Rethrow other errors
    }

    // 3. Update Incident Summary Safely
    const detectedDate = new Date(detectedAt);
    const updatedIncident = await Incident.findOneAndUpdate(
      { incidentId },
      { 
        $addToSet: { 'detectionSummary.uniqueGuardians': guardianId },
        $min: { 'detectionSummary.firstDetectedAt': detectedDate },
        $max: { 'detectionSummary.lastDetectedAt': detectedDate }
      },
      { new: true }
    );
    
    if (updatedIncident) {
      updatedIncident.detectionSummary.totalGuardians = updatedIncident.detectionSummary.uniqueGuardians.length;
      await updatedIncident.save();
    }

    res.json({
      success: true,
      eventId: event._id
    });

  } catch (error) {
    console.error('Error recording incident event:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to record event'
    });
  }
});

// GET /api/incidents - List recent incidents (for auditing / dashboard)
router.get('/', async (req, res) => {
  try {
    if (!isDbConnected()) {
      const list = Array.from(memoryIncidents.values());
      return res.json({ success: true, count: list.length, incidents: list });
    }

    const incidents = await Incident.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, count: incidents.length, incidents });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Failed to fetch incidents' });
  }
});

// GET /api/incidents/:incidentId - Fetch single incident details
router.get('/:incidentId', async (req, res) => {
  try {
    const { incidentId } = req.params;

    if (!isDbConnected()) {
      const inc = memoryIncidents.get(incidentId);
      if (!inc) {
        return res.status(404).json({ success: false, error: 'INCIDENT_NOT_FOUND', message: 'Incident not found' });
      }
      return res.json({ success: true, incident: inc });
    }

    const incident = await Incident.findOne({ incidentId });
    if (!incident) {
      return res.status(404).json({ success: false, error: 'INCIDENT_NOT_FOUND', message: 'Incident not found' });
    }

    res.json({ success: true, incident });
  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Failed to fetch incident' });
  }
});

// GET /api/incidents/:incidentId/events - Fetch all events for an incident (audit trail)
router.get('/:incidentId/events', async (req, res) => {
  try {
    const { incidentId } = req.params;

    if (!isDbConnected()) {
      const events = memoryIncidentEvents.filter(e => e.incidentId === incidentId);
      return res.json({ success: true, count: events.length, events });
    }

    const events = await IncidentEvent.find({ incidentId }).sort({ detectedAt: 1 });
    res.json({ success: true, count: events.length, events });
  } catch (error) {
    console.error('Error fetching incident events:', error);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Failed to fetch events' });
  }
});

// POST /api/incidents/:incidentId/end - End the incident
router.post('/:incidentId/end', async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { endedAt } = req.body;

    if (!isDbConnected()) {
      const inc = memoryIncidents.get(incidentId);
      if (!inc || inc.status !== 'active') {
        return res.status(404).json({
          success: false,
          error: 'INCIDENT_NOT_FOUND',
          message: 'Incident not found or already ended.'
        });
      }
      inc.status = 'ended';
      inc.endedAt = endedAt ? new Date(endedAt) : new Date();
      return res.json({ success: true });
    }

    const incident = await Incident.findOneAndUpdate(
      { incidentId, status: 'active' },
      { 
        status: 'ended',
        endedAt: endedAt ? new Date(endedAt) : new Date()
      },
      { new: true }
    );

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'INCIDENT_NOT_FOUND',
        message: 'Incident not found or already ended.'
      });
    }

    console.log(`SAFEMESH_INCIDENT: incident ended ${incidentId}`);

    res.json({
      success: true
    });

  } catch (error) {
    console.error('Error ending incident:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to end incident'
    });
  }
});

module.exports = router;
