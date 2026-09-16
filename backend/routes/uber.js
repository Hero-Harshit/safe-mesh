const express = require('express');
const router = express.Router();

// Mock function to check if Uber is connected
// In a real scenario, this would check the database for a valid OAuth token
const isUberConnected = () => {
  return !!process.env.UBER_API_KEY; // Treat the API key presence as "connected" for this test
};

// POST /api/uber/book - Prepare an Uber Sandbox booking request (Pipeline Foundation)
router.post('/book', async (req, res) => {
  try {
    const { pickup, destination } = req.body;

    // 1. Verify Uber Connection
    if (!isUberConnected()) {
      return res.status(400).json({
        success: false,
        error: 'UBER_NOT_CONNECTED',
        message: 'Uber account is not connected. Please authenticate.'
      });
    }

    // 2. Verify Sandbox Environment
    // Since this is a test pipeline, we mandate that it must run in sandbox mode
    const isSandbox = true; // In real life: process.env.UBER_ENV === 'sandbox'
    if (!isSandbox) {
      return res.status(400).json({
        success: false,
        error: 'UBER_SANDBOX_REQUIRED',
        message: 'This action is only allowed in the Uber Sandbox environment.'
      });
    }

    // 3. Verify Required Scope (Mock)
    // Assume we need 'request' scope to book rides
    const hasRequestScope = true; 
    if (!hasRequestScope) {
      return res.status(403).json({
        success: false,
        error: 'UBER_SCOPE_MISSING',
        message: 'Uber ride-request permission is not available for this account.'
      });
    }

    // 4. Validate Pickup Location
    if (!pickup || typeof pickup.latitude !== 'number' || typeof pickup.longitude !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_LOCATION',
        message: 'Pickup location is missing or invalid.'
      });
    }
    if (pickup.latitude < -90 || pickup.latitude > 90 || pickup.longitude < -180 || pickup.longitude > 180) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_LOCATION',
        message: 'Pickup coordinates are out of bounds.'
      });
    }

    // 5. Validate Destination
    if (!destination || typeof destination.latitude !== 'number' || typeof destination.longitude !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DESTINATION',
        message: 'Destination location is missing or invalid.'
      });
    }

    // 6. Return Structured Response (Pipeline Ready)
    // DO NOT create the Uber ride yet.
    return res.json({
      success: true,
      ready: true,
      environment: 'sandbox',
      pickup: {
        latitude: pickup.latitude,
        longitude: pickup.longitude
      },
      destination: {
        latitude: destination.latitude,
        longitude: destination.longitude,
        name: destination.name || 'Unknown Destination'
      },
      provider: 'uber'
    });

  } catch (error) {
    console.error('Error preparing Uber booking:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to prepare booking pipeline.'
    });
  }
});

module.exports = router;
