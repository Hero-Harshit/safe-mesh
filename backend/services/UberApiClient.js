const axios = require('axios');
const uberConfig = require('../config/uber');
const UberConnection = require('../models/UberConnection');
const UberAuthService = require('./UberAuthService');

class UberApiClient {
  /**
   * Helper to get a configured Axios instance for the given user.
   */
  async getClient(providerUserId) {
    const connection = await UberConnection.findOne({ providerUserId });
    
    if (!connection) {
      throw new Error('UBER_NOT_CONNECTED');
    }

    if (connection.tokenExpiresAt < new Date()) {
      throw new Error('UBER_UNAUTHORIZED'); // In a real app we would attempt refresh here
    }

    const accessToken = UberAuthService.decrypt(connection.accessTokenEncrypted);

    return axios.create({
      baseURL: uberConfig.baseUrl,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Retrieves available Uber products for a given location.
   */
  async getProducts(providerUserId, latitude, longitude) {
    try {
      const client = await this.getClient(providerUserId);
      const response = await client.get('/v1.2/products', {
        params: { latitude, longitude }
      });
      return response.data.products;
    } catch (error) {
      this.handleError(error, 'PRODUCT_LOOKUP_FAILED');
    }
  }

  /**
   * Requests a fare estimate for a specific product.
   */
  async getFareEstimate(providerUserId, productId, startLat, startLng, endLat, endLng) {
    try {
      const client = await this.getClient(providerUserId);
      const response = await client.post('/v1.2/requests/estimate', {
        product_id: productId,
        start_latitude: startLat,
        start_longitude: startLng,
        end_latitude: endLat,
        end_longitude: endLng
      });
      return response.data;
    } catch (error) {
      this.handleError(error, 'FARE_ESTIMATE_FAILED');
    }
  }

  handleError(error, defaultErrorCode) {
    if (error.message === 'UBER_NOT_CONNECTED' || error.message === 'UBER_UNAUTHORIZED') {
      throw error;
    }
    
    console.error(`Uber API Error (${defaultErrorCode}):`, error.response?.data || error.message);
    
    // Throw a safe error so we don't leak raw Uber API errors to the frontend
    const safeError = new Error(defaultErrorCode);
    safeError.code = defaultErrorCode;
    throw safeError;
  }
}

module.exports = new UberApiClient();
