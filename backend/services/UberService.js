const UberApiClient = require('./UberApiClient');
const BookingSession = require('../models/BookingSession');

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
    // Basic heuristics for deterministic selection
    // In Uber Sandbox, products might just be named "UberX", "UberBLACK", etc.
    // 1. Avoid shared rides if possible
    let eligible = products.filter(p => !p.shared);
    if (eligible.length === 0) eligible = products;

    // 2. Prefer 'UberX' as the standard baseline if available
    const standard = eligible.find(p => p.display_name && p.display_name.toLowerCase().includes('uberx'));
    if (standard) return standard;

    // 3. Fallback to the first available product
    return eligible[0];
  }

  /**
   * Main pipeline function for Phase 2.
   * Gets products, selects one, estimates fare, and prepares the booking response.
   */
  async prepareBooking(providerUserId, pickup, destination) {
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

    // 4. Save to temporary booking session to secure fare_id
    await BookingSession.create({
      providerUserId,
      fareId: estimate.fare.fare_id,
      productId: selectedProduct.product_id,
      pickup,
      destination
    });

    // 5. Return normalized structure
    return {
      success: true,
      environment: 'sandbox',
      readyToBook: true,
      pickup: {
        latitude: pickup.latitude,
        longitude: pickup.longitude
      },
      destination: {
        latitude: destination.latitude,
        longitude: destination.longitude,
        name: destination.name || 'Uber Sandbox Test Destination'
      },
      product: {
        id: selectedProduct.product_id,
        name: selectedProduct.display_name || 'Uber',
        displayName: selectedProduct.display_name || 'Uber'
      },
      estimate: {
        fare: estimate.fare.display, // e.g. "₹250" or "250.00"
        currency: estimate.fare.currency_code,
        durationSeconds: estimate.trip.duration_estimate,
        distanceMeters: estimate.trip.distance_estimate ? estimate.trip.distance_estimate * 1000 : undefined
      },
      booking: {
        fareIdAvailable: true
      }
    };
  }
}

module.exports = new UberService();
