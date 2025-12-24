import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { fetchFearAndGreedIndex } from "../fng";

const mockFetch = mock();

describe("FNG Service", () => {
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("fetches data successfully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{
          value: "75",
          value_classification: "Greed",
          timestamp: "1234567890"
        }]
      })
    });

    const result = await fetchFearAndGreedIndex();
    expect(result.value).toBe("75");
    expect(result.value_classification).toBe("Greed");
  });

  it("throws error on API failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Server Error"
    });

    try {
      await fetchFearAndGreedIndex();
      expect(true).toBe(false); // Should not reach here
    } catch (e: any) {
      expect(e.message).toContain("API Error: 500");
    }
  });

  it("throws error on invalid data format", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: []
      })
    });

    try {
      await fetchFearAndGreedIndex();
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e.message).toBe("Invalid API response format");
    }
  });
});
