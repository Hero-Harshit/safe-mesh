const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');
const IncidentEvent = require('../models/IncidentEvent');

// POST /api/incidents - Start a new incident
router.post('/', async (req, res) => {
  try {
    const { emergencyId, sender, location } = req.body;

    if (!emergencyId || !sender || !sender.safehelpId) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Missing required fields: emergencyId, sender.safehelpId'
      });
    }

    // Generate a unique server-side incident ID
    // Example: INC_YYYYMMDD_emergencyId
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const incidentId = `INC_${dateStr}_${emergencyId}_${Date.now()}`;

    const incident = new Incident({
      incidentId,
      emergencyId,
      sender: {
        safehelpId: sender.safehelpId,
        location: {
          latitude: location?.latitude,
          longitude: location?.longitude
        }
      }
    });

    await incident.save();

    console.log(`SAFEHELP_INCIDENT: incident created ${incidentId}`);

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
    const updateQuery = {
      $addToSet: { 'detectionSummary.uniqueGuardians': guardianId }
    };
    
    // Only set firstDetectedAt if it doesn't exist
    if (!incident.detectionSummary.firstDetectedAt || incident.detectionSummary.firstDetectedAt > event.detectedAt) {
        // Handled via separate logic or $min to avoid race conditions
    }

    await Incident.findOneAndUpdate(
      { incidentId },
      { 
        $addToSet: { 'detectionSummary.uniqueGuardians': guardianId },
        $min: { 'detectionSummary.firstDetectedAt': event.detectedAt },
        $max: { 'detectionSummary.lastDetectedAt': event.detectedAt }
      },
      { new: true }
    );
    
    // Calculate total guardians efficiently
    const updatedIncident = await Incident.findOne({ incidentId });
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

// POST /api/incidents/:incidentId/end - End the incident
router.post('/:incidentId/end', async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { endedAt } = req.body;

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

    console.log(`SAFEHELP_INCIDENT: incident ended ${incidentId}`);

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
