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

  /**
   * Requests an actual Uber Sandbox ride using a valid fare_id.
   */
  async requestRide(providerUserId, productId, fareId, startLat, startLng, endLat, endLng) {
    try {
      const client = await this.getClient(providerUserId);
      const response = await client.post('/v1.2/requests', {
        product_id: productId,
        fare_id: fareId,
        start_latitude: startLat,
        start_longitude: startLng,
        end_latitude: endLat,
        end_longitude: endLng
      });
      return response.data;
    } catch (error) {
      this.handleError(error, 'RIDE_REQUEST_FAILED');
    }
  }

  /**
   * Gets the real-time status of a Sandbox ride.
   */
  async getRideDetails(providerUserId, requestId) {
    try {
      const client = await this.getClient(providerUserId);
      const response = await client.get(`/v1.2/requests/${requestId}`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'RIDE_NOT_FOUND');
    }
  }

  /**
   * Cancels a Sandbox ride.
   */
  async cancelRide(providerUserId, requestId) {
    try {
      const client = await this.getClient(providerUserId);
      const response = await client.delete(`/v1.2/requests/${requestId}`);
      // Usually returns 204 No Content on success
      return response.status === 204 || response.status === 200;
    } catch (error) {
      this.handleError(error, 'RIDE_CANCEL_FAILED');
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
