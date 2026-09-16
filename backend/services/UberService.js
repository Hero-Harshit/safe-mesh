const UberApiClient = require('./UberApiClient');
const BookingSession = require('../models/BookingSession');
const SafeRide = require('../models/SafeRide');

class UberService {
  /**
   * Retrieves available products and selects the best one deterministically.
   */
  async getAvailableProducts(providerUserId, lat, lng) {
    const products = await UberApiClient.getProducts(providerUserId, lat, lng);
    
    if (!products || products.length === 0) {
      throw new Error('NO_PRODUCTS_AVAILABLE');
    }
    
    return products;
  }

  /**
   * Selects the best product based on Priority: Available > Fast/Standard > Not Shared.
   */
  selectBestProduct(products) {
    let eligible = products.filter(p => !p.shared);
    if (eligible.length === 0) eligible = products;
    const standard = eligible.find(p => p.display_name && p.display_name.toLowerCase().includes('uberx'));
    if (standard) return standard;
    return eligible[0];
  }

  /**
   * Main pipeline function for Phase 3.
   * Prevents duplicates, gets products, selects one, estimates fare, requests sandbox ride, saves to SafeRide.
   */
  async bookRide(providerUserId, pickup, destination) {
    // 0. Duplicate Ride Protection
    // Check if there is already an active ride for this user
    const existingRide = await SafeRide.findOne({
      providerUserId,
      status: { $nin: ['completed', 'cancelled', 'failed'] }
    });

    if (existingRide) {
      // Return the existing ride immediately, do not create a new one
      return this._formatRideResponse(existingRide);
    }

    // 1. Get products
    const products = await this.getAvailableProducts(providerUserId, pickup.latitude, pickup.longitude);
    
    // 2. Select best product
    const selectedProduct = this.selectBestProduct(products);
    if (!selectedProduct) {
      throw new Error('PRODUCT_LOOKUP_FAILED');
    }

    // 3. Get Fare Estimate
    const estimate = await UberApiClient.getFareEstimate(
      providerUserId, 
      selectedProduct.product_id, 
      pickup.latitude, 
      pickup.longitude, 
      destination.latitude, 
      destination.longitude
    );

    if (!estimate || !estimate.fare || !estimate.fare.fare_id) {
      throw new Error('FARE_ESTIMATE_FAILED');
    }

    // 4. Submit Sandbox Ride Request
    const requestResult = await UberApiClient.requestRide(
      providerUserId,
      selectedProduct.product_id,
      estimate.fare.fare_id,
      pickup.latitude, 
      pickup.longitude, 
      destination.latitude, 
      destination.longitude
    );

    if (!requestResult || !requestResult.request_id) {
      throw new Error('RIDE_REQUEST_FAILED');
    }

    // 5. Save to MongoDB SafeRide
    const safeRide = await SafeRide.create({
      providerUserId,
      provider: 'uber',
      environment: 'sandbox',
      providerRideId: requestResult.request_id,
      pickupLatitude: pickup.latitude,
      pickupLongitude: pickup.longitude,
      destinationLatitude: destination.latitude,
      destinationLongitude: destination.longitude,
      destinationName: destination.name || 'Uber Sandbox Test Destination',
      productId: selectedProduct.product_id,
      productName: selectedProduct.display_name || 'Uber',
      estimatedFare: estimate.fare.display,
      currency: estimate.fare.currency_code,
      status: requestResult.status || 'processing'
    });

    // 6. Return normalized structure
    return this._formatRideResponse(safeRide, estimate);
  }

  /**
   * Gets ride status from Uber, syncs it to MongoDB, returns normalized.
   */
  async getRideStatus(providerUserId, requestId) {
    const safeRide = await SafeRide.findOne({ providerRideId: requestId, providerUserId });
    if (!safeRide) {
      throw new Error('RIDE_NOT_FOUND');
    }

    // If already terminal locally, no need to poll Uber
    if (['completed', 'cancelled', 'failed'].includes(safeRide.status)) {
      return this._formatRideResponse(safeRide);
    }

    // Poll Uber Sandbox
    const details = await UberApiClient.getRideDetails(providerUserId, requestId);
    if (!details) {
      throw new Error('RIDE_NOT_FOUND');
    }

    // Sync status to Mongo
    if (safeRide.status !== details.status) {
      safeRide.status = details.status;
      await safeRide.save();
    }

    return this._formatRideResponse(safeRide);
  }

  /**
   * Cancels the Sandbox ride and updates MongoDB.
   */
  async cancelRide(providerUserId, requestId) {
    const safeRide = await SafeRide.findOne({ providerRideId: requestId, providerUserId });
    if (!safeRide) {
      throw new Error('RIDE_NOT_FOUND');
    }

    if (['completed', 'cancelled', 'failed'].includes(safeRide.status)) {
      return { success: true, message: 'Ride already in terminal state' };
    }

    const success = await UberApiClient.cancelRide(providerUserId, requestId);
    if (!success) {
      throw new Error('RIDE_CANCEL_FAILED');
    }

    safeRide.status = 'cancelled';
    await safeRide.save();

    return { success: true, message: 'Ride cancelled successfully' };
  }

  _formatRideResponse(safeRide, estimate = null) {
    const response = {
      success: true,
      environment: safeRide.environment,
      ride: {
        requestId: safeRide.providerRideId,
        status: safeRide.status,
        productName: safeRide.productName,
        pickup: {
          latitude: safeRide.pickupLatitude,
          longitude: safeRide.pickupLongitude
        },
        destination: {
          latitude: safeRide.destinationLatitude,
          longitude: safeRide.destinationLongitude,
          name: safeRide.destinationName
        },
        estimatedFare: safeRide.estimatedFare,
        currency: safeRide.currency
      }
    };

    if (estimate) {
      response.estimate = {
        durationSeconds: estimate.trip.duration_estimate,
        distanceMeters: estimate.trip.distance_estimate ? estimate.trip.distance_estimate * 1000 : undefined
      };
    }

    return response;
  }
}

module.exports = new UberService();
