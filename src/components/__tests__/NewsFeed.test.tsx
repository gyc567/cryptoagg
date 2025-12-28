import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { NewsFeed } from "../feeds/NewsFeed";
import { newsService } from "@/services/news";

// Mock Lucide icons
mock.module("lucide-react", () => ({
  Newspaper: () => <div data-testid="icon-newspaper" />,
  ExternalLink: () => <div data-testid="icon-external-link" />,
}));

// Mock DataCard
mock.module("@/components/ui/DataCard", () => ({
  DataCard: ({ children, title, icon }: any) => (
    <div data-testid="datacard">
      <div data-testid="datacard-title">{title}</div>
      <div data-testid="datacard-icon">{icon}</div>
      {children}
    </div>
  ),
}));

describe("NewsFeed Component", () => {
  beforeEach(() => {
    newsService.reset();
  });

  afterEach(() => {
    cleanup();
    newsService.reset();
  });

  it("renders news items from service", async () => {
    render(<NewsFeed />);
    
    // Initial data from service has 6 items
    await waitFor(() => {
      expect(screen.queryByText("比特币突破10万美元关口，创历史新高")).toBeTruthy();
    });
    
    expect(screen.getByText("BlockBeats")).toBeTruthy();
    expect(screen.getAllByText("重要").length).toBeGreaterThan(0);
  });
});
