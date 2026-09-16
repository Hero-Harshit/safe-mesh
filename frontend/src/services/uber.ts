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
  ride: {
    requestId: string;
    status: string;
    productName: string;
    pickup: {
      latitude: number;
      longitude: number;
    };
    destination: {
      latitude: number;
      longitude: number;
      name: string;
    };
    estimatedFare?: string;
    currency?: string;
  };
  estimate?: {
    durationSeconds: number;
    distanceMeters: number;
  };
}

export async function getUberStatus(): Promise<UberStatus> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const res = await fetch(`${API_BASE}/api/uber/status`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error(`Failed to fetch Uber status (HTTP ${res.status})`);
    return await res.json();
  } catch (error) {
    clearTimeout(timeoutId);
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let res;
  try {
    res = await fetch(`${API_BASE}/api/uber/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ pickup, destination }),
      signal: controller.signal
    });
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') throw new Error('Booking request timed out.');
    throw error;
  }
  
  clearTimeout(timeoutId);

  const data = await res.json();
  
  if (!res.ok || !data.success) {
    const error = new Error(data.message || 'Failed to book sandbox ride.');
    (error as any).code = data.error;
    throw error;
  }

  return data;
}

export async function getUberRideStatus(requestId: string): Promise<UberBookingResponse> {
  const res = await fetch(`${API_BASE}/api/uber/requests/${requestId}`);
  const data = await res.json();

  if (!res.ok || !data.success) {
    const error = new Error(data.error || 'Failed to get ride status.');
    (error as any).code = data.error;
    throw error;
  }

  return data;
}

export async function cancelUberRide(requestId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/uber/requests/${requestId}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  return data.success;
}
