const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface UberStatus {
  success: boolean;
  connected: boolean;
  environment: string;
  scopes?: string[];
  tokenActive?: boolean;
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
