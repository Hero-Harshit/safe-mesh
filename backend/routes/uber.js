const express = require('express');
const router = express.Router();
const uberConfig = require('../config/uber');
const UberAuthService = require('../services/UberAuthService');
const UberConnection = require('../models/UberConnection');

// GET /api/uber/auth - Initiates OAuth flow
router.get('/auth', async (req, res) => {
  try {
    const authUrl = await UberAuthService.generateAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error generating Uber auth URL:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate Uber connection' });
  }
});

// GET /api/uber/callback - Handles OAuth callback
router.get('/callback', async (req, res) => {
  const { code, state, error: authError } = req.query;

  // URL of the frontend app
  // In development, this is typically http://localhost:5173 or the Vercel URL
  // We'll rely on the frontend being hosted at muj-cnaf.vercel.app as per instructions
  // or a fallback frontend URI if supplied
  const frontendSandboxUrl = process.env.FRONTEND_URL 
    ? `${process.env.FRONTEND_URL}/uber-sandbox`
    : 'https://muj-cnaf.vercel.app/uber-sandbox';

  if (authError) {
    console.error('Uber OAuth error from provider:', authError);
    return res.redirect(`${frontendSandboxUrl}?error=${encodeURIComponent(authError)}`);
  }

  if (!code || !state) {
    return res.redirect(`${frontendSandboxUrl}?error=missing_credentials`);
  }

  try {
    // Exchange the code for a token
    const tokenData = await UberAuthService.exchangeCode(code, state);

    const tokenExpiresAt = new Date(Date.now() + tokenData.expiresIn * 1000);

    // Save connection to DB
    // Since this is a single user test dashboard, we just upsert a single UberConnection record
    // In a real app, you would tie this to the authenticated user's ID
    const providerUserId = 'sandbox-user-1';

    await UberConnection.findOneAndUpdate(
      { providerUserId },
      {
        provider: 'uber',
        environment: uberConfig.env,
        providerUserId,
        accessTokenEncrypted: tokenData.accessTokenEncrypted,
        refreshTokenEncrypted: tokenData.refreshTokenEncrypted,
        tokenExpiresAt,
        scopes: tokenData.scopes,
      },
      { upsert: true, new: true }
    );

    // Successfully connected! Redirect to the frontend sandbox page
    res.redirect(`${frontendSandboxUrl}?success=true`);

  } catch (error) {
    console.error('Error in Uber callback:', error);
    const errorMessage = error.message === 'UBER_OAUTH_STATE_MISMATCH' 
      ? 'state_mismatch' 
      : 'exchange_failed';
    res.redirect(`${frontendSandboxUrl}?error=${errorMessage}`);
  }
});

// GET /api/uber/status - Get connection status safely
router.get('/status', async (req, res) => {
  try {
    const providerUserId = 'sandbox-user-1';
    const connection = await UberConnection.findOne({ providerUserId });

    if (!connection) {
      return res.json({
        success: true,
        connected: false,
        environment: uberConfig.env
      });
    }

    // Check if token is still active (not strictly checking with Uber, just our DB exp)
    const tokenActive = connection.tokenExpiresAt > new Date();

    res.json({
      success: true,
      connected: true,
      environment: connection.environment,
      scopes: connection.scopes,
      tokenActive
    });
  } catch (error) {
    console.error('Error checking Uber status:', error);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// POST /api/uber/disconnect - Removes the connection
router.post('/disconnect', async (req, res) => {
  try {
    const providerUserId = 'sandbox-user-1';
    await UberConnection.deleteOne({ providerUserId });
    
    res.json({ success: true, message: 'Disconnected' });
  } catch (error) {
    console.error('Error disconnecting Uber:', error);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

const UberService = require('../services/UberService');

// POST /api/uber/book - Prepare an Uber Sandbox booking request (Product & Fare Pipeline)
router.post('/book', async (req, res) => {
  try {
    const { pickup, destination } = req.body;
    const providerUserId = 'sandbox-user-1'; // Development mock

    // 1. Verify Sandbox Environment
    if (uberConfig.env !== 'sandbox') {
      return res.status(400).json({
        success: false,
        error: 'UBER_SANDBOX_REQUIRED',
        message: 'This action is only allowed in the Uber Sandbox environment.'
      });
    }

    // 2. Validate Pickup Location
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

    // 3. Validate Destination
    if (!destination || typeof destination.latitude !== 'number' || typeof destination.longitude !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DESTINATION',
        message: 'Destination location is missing or invalid.'
      });
    }

    // 4. Verify Connection & Scope (Handled by UberApiClient inside prepareBooking when it decrypts)
    // 5. Retrieve Products, Select Product, Request Fare Estimate
    const bookingResponse = await UberService.prepareBooking(providerUserId, pickup, destination);

    return res.json(bookingResponse);

  } catch (error) {
    console.error('Error preparing Uber booking:', error.response?.data || error.message);
    
    // Catch known error codes thrown by our client/service
    const knownErrors = ['UBER_NOT_CONNECTED', 'UBER_UNAUTHORIZED', 'NO_PRODUCTS_AVAILABLE', 'PRODUCT_LOOKUP_FAILED', 'FARE_ESTIMATE_FAILED'];
    
    if (knownErrors.includes(error.code) || knownErrors.includes(error.message)) {
       return res.status(400).json({
         success: false,
         error: error.code || error.message,
         message: 'Failed to prepare booking pipeline.'
       });
    }

    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to prepare booking pipeline due to a server error.'
    });
  }
});

module.exports = router;
