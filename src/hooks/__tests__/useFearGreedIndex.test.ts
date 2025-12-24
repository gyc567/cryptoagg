import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import { useFearGreedIndex } from "../useFearGreedIndex";

// Mock the service
const mockFetchFng = mock();

mock.module("@/services/fng", () => ({
  fetchFearAndGreedIndex: mockFetchFng
}));

describe("useFearGreedIndex", () => {
  beforeEach(() => {
    mockFetchFng.mockReset();
  });

  it("loads data on mount", async () => {
    mockFetchFng.mockResolvedValue({
      value: "20",
      value_classification: "Extreme Fear",
      timestamp: "123"
    });

    const { result } = renderHook(() => useFearGreedIndex());

    // Initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();

    // Wait for update
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.value).toBe("20");
    expect(result.current.error).toBeNull();
  });

  it("handles errors", async () => {
    mockFetchFng.mockRejectedValue(new Error("Network Error"));

    const { result } = renderHook(() => useFearGreedIndex());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("Network Error");
    expect(result.current.data).toBeNull();
  });
});
