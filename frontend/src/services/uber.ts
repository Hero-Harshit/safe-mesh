const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface UberStatus {
  success: boolean;
  connected: boolean;
  environment: string;
  scopes?: string[];
  tokenActive?: boolean;
}

export interface UberBookingResponse {
  success: boolean;
  environment: string;
  readyToBook: boolean;
  pickup: {
    latitude: number;
    longitude: number;
  };
  destination: {
    latitude: number;
    longitude: number;
    name: string;
  };
  product: {
    id: string;
    name: string;
    displayName: string;
  };
  estimate: {
    fare: string;
    currency: string;
    durationSeconds: number;
    distanceMeters: number;
  };
  booking: {
    fareIdAvailable: boolean;
  };
}

export async function getUberStatus(): Promise<UberStatus> {
  try {
    const res = await fetch(`${API_BASE}/api/uber/status`);
    if (!res.ok) throw new Error('Failed to fetch Uber status');
    return await res.json();
  } catch (error) {
    console.error('Error fetching Uber status:', error);
    return {
      success: false,
      connected: false,
      environment: 'unknown'
    };
  }
}

export async function disconnectUber(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/uber/disconnect`, {
      method: 'POST'
    });
    const data = await res.json();
    return data.success;
  } catch (error) {
    console.error('Error disconnecting Uber:', error);
    return false;
  }
}

export async function bookUber(pickup: { latitude: number, longitude: number }, destination: { latitude: number, longitude: number, name: string }): Promise<UberBookingResponse> {
  const res = await fetch(`${API_BASE}/api/uber/book`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ pickup, destination })
  });

  const data = await res.json();
  
  if (!res.ok || !data.success) {
    const error = new Error(data.message || 'Failed to prepare booking pipeline.');
    (error as any).code = data.error;
    throw error;
  }

  return data;
}
