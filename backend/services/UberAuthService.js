const crypto = require('crypto');
const axios = require('axios');
const uberConfig = require('../config/uber');
const OAuthState = require('../models/OAuthState');

// Encryption setup
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'); // Fallback for local testing if not set
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

class UberAuthService {
  /**
   * Generates a secure OAuth URL and saves the state to DB.
   */
  async generateAuthUrl() {
    const state = crypto.randomBytes(16).toString('hex');
    await OAuthState.create({ state });

    const url = new URL(`${uberConfig.loginUrl}/oauth/v2/authorize`);
    url.searchParams.append('client_id', uberConfig.clientId);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('redirect_uri', uberConfig.redirectUri);
    url.searchParams.append('scope', uberConfig.scopes);
    url.searchParams.append('state', state);

    return url.toString();
  }

  /**
   * Validates state and exchanges the authorization code for tokens.
   */
  async exchangeCode(code, state) {
    // Validate state
    const validState = await OAuthState.findOne({ state });
    if (!validState) {
      throw new Error('UBER_OAUTH_STATE_MISMATCH');
    }
    // State is single-use
    await OAuthState.deleteOne({ state });

    // Exchange code for token
    const tokenUrl = `${uberConfig.loginUrl}/oauth/v2/token`;
    
    // Uber expects form urlencoded data
    const params = new URLSearchParams();
    params.append('client_id', uberConfig.clientId);
    params.append('client_secret', uberConfig.clientSecret);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', uberConfig.redirectUri);
    params.append('code', code);

    const response = await axios.post(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = response.data;

    return {
      accessTokenEncrypted: encrypt(data.access_token),
      refreshTokenEncrypted: data.refresh_token ? encrypt(data.refresh_token) : null,
      expiresIn: data.expires_in,
      scopes: data.scope ? data.scope.split(' ') : ['request'],
    };
  }
}

module.exports = new UberAuthService();
