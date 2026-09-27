const crypto = require('crypto');
const axios = require('axios');
const uberConfig = require('../config/uber');
const OAuthState = require('../models/OAuthState');

// Encryption setup: guaranteed 32-byte Buffer
function getKeyBuffer() {
  const key = process.env.ENCRYPTION_KEY;
  if (key && key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex');
  }
  if (key && key.length > 0) {
    return crypto.createHash('sha256').update(key).digest();
  }
  return crypto.createHash('sha256').update('safemesh_default_dev_encryption_key').digest();
}

const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', getKeyBuffer(), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', getKeyBuffer(), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

const mongoose = require('mongoose');
const isDbConnected = () => mongoose.connection.readyState === 1;
const memoryStates = new Set();

class UberAuthService {
  /**
   * Decrypts an encrypted token.
   */
  decrypt(text) {
    return decrypt(text);
  }

  /**
   * Generates a secure OAuth URL and saves the state to DB.
   */
  async generateAuthUrl() {
    const state = crypto.randomBytes(16).toString('hex');
    if (isDbConnected()) {
      await OAuthState.create({ state });
    } else {
      memoryStates.add(state);
    }

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
    if (isDbConnected()) {
      const validState = await OAuthState.findOne({ state });
      if (!validState) {
        throw new Error('UBER_OAUTH_STATE_MISMATCH');
      }
      // State is single-use
      await OAuthState.deleteOne({ state });
    } else {
      if (!memoryStates.has(state)) {
        throw new Error('UBER_OAUTH_STATE_MISMATCH');
      }
      memoryStates.delete(state);
    }

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
