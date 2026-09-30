const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// Helper to convert lat/lng to PostGIS Point format: 'POINT(lon lat)'
const toPoint = (location) => {
  if (location && location.latitude !== undefined && location.longitude !== undefined) {
    return `POINT(${location.longitude} ${location.latitude})`;
  }
  return null;
};

// POST /api/incidents - Start a new incident
router.post('/', async (req, res) => {
  try {
    const { emergencyId, sender, location, triggerSource } = req.body;
    const senderId = sender?.safetymeshId || sender?.safehelpId || sender?.userId;

    if (!emergencyId || !sender || !senderId) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Missing required fields: emergencyId, sender.safetymeshId'
      });
    }

    // Generate a unique server-side incident ID
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const incidentId = `INC_${dateStr}_${emergencyId}_${Date.now()}`;

    const { data, error } = await supabase
      .from('incidents')
      .insert([
        {
          incident_id: incidentId,
          emergency_id: emergencyId,
          trigger_source: triggerSource || 'web',
          sender_safehelp_id: senderId,
          sender_location: toPoint(location)
        }
      ])
      .select();

    if (error) {
      throw error;
    }

    console.log(`SAFETYMESH_INCIDENT: incident created ${incidentId}`);

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

    // 1. Verify incident exists and is active
    const { data: incident, error: fetchError } = await supabase
      .from('incidents')
      .select('*')
      .eq('incident_id', incidentId)
      .single();

    if (fetchError || !incident) {
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

    if (incident.emergency_id !== emergencyId) {
      return res.status(400).json({
        success: false,
        error: 'EMERGENCY_ID_MISMATCH',
        message: 'The emergencyId does not match the incident.'
      });
    }

    // 2. Insert event (duplicate protection via timeBucket & DB constraint)
    const detectedTimestamp = new Date(detectedAt).getTime();
    const WINDOW_SECONDS = 60;
    const timeBucket = Math.floor(detectedTimestamp / (WINDOW_SECONDS * 1000));

    const { data: eventResult, error: insertError } = await supabase
      .from('incident_events')
      .insert([
        {
          incident_id: incidentId,
          emergency_id: emergencyId,
          guardian_id: guardianId,
          event_type: 'guardian_detection',
          detected_at: new Date(detectedAt).toISOString(),
          rssi,
          proximity,
          location: toPoint(location),
          app_version: appVersion,
          time_bucket: timeBucket
        }
      ])
      .select();

    if (insertError) {
      // Postgres unique constraint violation code is 23505
      if (insertError.code === '23505') {
        console.log(`SAFETYMESH_INCIDENT: duplicate event ignored for guardian ${guardianId}`);
        return res.json({
          success: true,
          eventId: 'duplicate_ignored'
        });
      }
      throw insertError;
    }

    // 3. Update Incident Summary (in Postgres, we fetch, merge, and update jsonb)
    let summary = incident.detection_summary || { totalGuardians: 0, firstDetectedAt: null, lastDetectedAt: null, uniqueGuardians: [] };
    const detectedDateStr = new Date(detectedAt).toISOString();
    
    let isUpdated = false;
    
    if (!summary.uniqueGuardians.includes(guardianId)) {
      summary.uniqueGuardians.push(guardianId);
      summary.totalGuardians = summary.uniqueGuardians.length;
      isUpdated = true;
    }

    if (!summary.firstDetectedAt || new Date(detectedDateStr) < new Date(summary.firstDetectedAt)) {
      summary.firstDetectedAt = detectedDateStr;
      isUpdated = true;
    }

    if (!summary.lastDetectedAt || new Date(detectedDateStr) > new Date(summary.lastDetectedAt)) {
      summary.lastDetectedAt = detectedDateStr;
      isUpdated = true;
    }

    if (isUpdated) {
      await supabase
        .from('incidents')
        .update({ detection_summary: summary })
        .eq('incident_id', incidentId);
    }

    res.json({
      success: true,
      eventId: eventResult[0].id
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
    const { data: incidents, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

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

    const { data: incident, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('incident_id', incidentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return res.status(404).json({ success: false, error: 'INCIDENT_NOT_FOUND', message: 'Incident not found' });
      }
      throw error;
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

    const { data: events, error } = await supabase
      .from('incident_events')
      .select('*')
      .eq('incident_id', incidentId)
      .order('detected_at', { ascending: true });

    if (error) throw error;

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

    const { data: incident, error: updateError } = await supabase
      .from('incidents')
      .update({ 
        status: 'ended', 
        ended_at: endedAt ? new Date(endedAt).toISOString() : new Date().toISOString() 
      })
      .eq('incident_id', incidentId)
      .eq('status', 'active')
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'INCIDENT_NOT_FOUND',
          message: 'Incident not found or already ended.'
        });
      }
      throw updateError;
    }

    console.log(`SAFETYMESH_INCIDENT: incident ended ${incidentId}`);

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
