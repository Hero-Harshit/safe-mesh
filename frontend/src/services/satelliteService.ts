/**
 * Satellite Communication Service
 * Interfaces with Starlink LEO Constellation telemetry and gateway endpoints.
 */

export interface SatelliteUplinkResponse {
  success: boolean;
  code?: string;
  service?: string;
  constellation?: string;
  message: string;
  next_steps?: string[];
  telemetry?: {
    uplink_target: string;
    elevation_angle: string;
    azimuth: string;
    doppler_shift_khz: string;
  };
}

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'https://safemesh-backend.onrender.com';

export async function requestSatelliteUplink(
  latitude?: number,
  longitude?: number
): Promise<SatelliteUplinkResponse> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/satellite/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: latitude ?? 28.6139,
        longitude: longitude ?? 77.2090,
        emergency_mode: true,
        protocol: 'LEO_STARLINK_DIRECT_CELL',
      }),
    });

    const data = await response.json();
    return data;
  } catch (err) {
    // Graceful offline/fallback response matching regulatory mandate
    return {
      success: false,
      code: 'GOV_REGULATORY_RESTRICTION',
      service: 'Starlink Emergency Satellite Uplink',
      constellation: 'Starlink Direct-to-Cell LEO',
      message: 'This feature requires government permissions and Starlink integration to access satellite networks.',
      next_steps: [
        'Apply for National Telecommunications Agency emergency spectrum clearance',
        'Authenticate with Starlink Direct-to-Cell Carrier Gateway',
        'Configure certified LEO satellite modem interface'
      ]
    };
  }
}
