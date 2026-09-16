const dotenv = require('dotenv');
dotenv.config();

const uberConfig = {
  env: process.env.UBER_ENV || 'sandbox',
  baseUrl: process.env.UBER_BASE_URL || 'https://sandbox-api.uber.com',
  loginUrl: process.env.UBER_LOGIN_URL || 'https://login.uber.com',
  clientId: process.env.UBER_CLIENT_ID,
  clientSecret: process.env.UBER_CLIENT_SECRET,
  redirectUri: process.env.UBER_REDIRECT_URI,
  scopes: process.env.UBER_SCOPES || 'request',
};

module.exports = uberConfig;
