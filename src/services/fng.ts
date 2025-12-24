export interface FngData {
  value: string;
  value_classification: string;
  timestamp: string;
  time_until_update?: string;
}

export interface FngResponse {
  name: string;
  data: FngData[];
  metadata?: {
    error?: any;
  };
}

/**
 * Fetch the latest Fear and Greed Index
 */
export async function fetchFearAndGreedIndex(): Promise<FngData> {
  try {
    const response = await fetch('https://api.alternative.me/fng/?limit=1');
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const json: FngResponse = await response.json();
    
    if (!json.data || json.data.length === 0) {
      throw new Error('Invalid API response format');
    }

    return json.data[0];
  } catch (error) {
    console.error('[FNG Service] Failed to fetch:', error);
    throw error;
  }
}
