import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useCryptoNews } from "../useCryptoNews";
import { newsService } from "@/services/news";

describe("useCryptoNews hook", () => {
  beforeEach(() => {
    newsService.reset();
  });

  afterEach(() => {
    newsService.reset();
  });

  it("should initialize with loading state and then receive news", async () => {
    const { result } = renderHook(() => useCryptoNews());

    // Initially loading might be true or false depending on how fast the subscription triggers
    // But since it calls subscriber(this.news) immediately, it might be false right away
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.news.length).toBe(6);
    expect(result.current.news[0].source).toBe("BlockBeats");
  });

  it("should update when news service notifies of new news", async () => {
    const { result } = renderHook(() => useCryptoNews());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialCount = result.current.news.length;

    // Trigger new news
    act(() => {
      // @ts-ignore - accessing private method for testing
      newsService.fetchNewNews();
    });

    await waitFor(() => {
      expect(result.current.news.length).toBe(initialCount + 1);
    });
  });
});
