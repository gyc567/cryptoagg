import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { newsService } from "../news";
import { CryptoNewsItem } from "@/server/types";

describe("NewsService", () => {
  beforeEach(() => {
    newsService.reset();
  });

  afterEach(() => {
    newsService.reset();
  });

  it("should be a singleton", () => {
    const instance1 = newsService;
    const instance2 = newsService;
    expect(instance1).toBe(instance2);
  });

  it("should provide initial mock data on subscription", () => {
    const receivedNews: CryptoNewsItem[][] = [];
    const unsubscribe = newsService.subscribe((news) => {
      receivedNews.push(news);
    });

    expect(receivedNews[0].length).toBe(6);
    expect(receivedNews[0][0].source).toBe("BlockBeats");
    unsubscribe();
  });

  it("should notify subscribers when new news is fetched", (done) => {
    let callCount = 0;
    let unsubscribe: () => void;
    unsubscribe = newsService.subscribe((news) => {
      callCount++;
      if (callCount === 1) {
        expect(news.length).toBe(6);
        // Manually trigger fetch for testing
        setTimeout(() => {
          // @ts-ignore - accessing private method for testing
          newsService.fetchNewNews();
        }, 0);
      } else if (callCount === 2) {
        expect(news.length).toBe(7);
        if (unsubscribe) unsubscribe();
        done();
      }
    });
  });

  it("should handle multiple subscribers", () => {
    let count1 = 0;
    let count2 = 0;
    
    const unsub1 = newsService.subscribe(() => count1++);
    const unsub2 = newsService.subscribe(() => count2++);
    
    // @ts-ignore - accessing private method for testing
    newsService.fetchNewNews();
    
    expect(count1).toBe(2); // Initial + 1 fetch
    expect(count2).toBe(2);
    
    unsub1();
    unsub2();
  });

  it("should stop polling when no subscribers remain", () => {
    const unsub = newsService.subscribe(() => {});
    // @ts-ignore - accessing private property for testing
    expect(newsService.pollInterval).not.toBeNull();
    
    unsub();
    // @ts-ignore - accessing private property for testing
    expect(newsService.pollInterval).toBeNull();
  });
});