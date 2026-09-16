export interface SafeDestination {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
}

export interface Point {
  latitude: number;
  longitude: number;
}

export interface RouteData {
  distanceMeters: number;
  durationSeconds: number;
  geometry: Point[];
}

export interface EscapeRouteResponse {
  success: boolean;
  reason?: string;
  destination?: SafeDestination;
  route?: RouteData | null;
}

export async function getEscapeRoute(latitude: number, longitude: number): Promise<EscapeRouteResponse> {
  const baseUrl = 'https://muj-k53c.onrender.com';
  
  try {
    const response = await fetch(`${baseUrl}/api/safety/escape-route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude,
        longitude,
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: EscapeRouteResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch escape route:", error);
    return {
      success: false,
      reason: 'NETWORK_ERROR'
    };
  }
}
