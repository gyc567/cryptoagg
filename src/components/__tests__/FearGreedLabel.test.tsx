import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { FearGreedLabel } from "../FearGreedLabel";

// Mock the hook
const mockUseFearGreedIndex = mock();

mock.module("@/hooks/useFearGreedIndex", () => ({
  useFearGreedIndex: mockUseFearGreedIndex
}));

// Mock Lucide icons
mock.module("lucide-react", () => ({
  TrendingUp: () => <div data-testid="icon-trending-up" />,
  TrendingDown: () => <div data-testid="icon-trending-down" />,
  Minus: () => <div data-testid="icon-minus" />,
}));

describe("FearGreedLabel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders loading state", () => {
    mockUseFearGreedIndex.mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    });

    render(<FearGreedLabel />);
    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("renders error state", () => {
    mockUseFearGreedIndex.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Failed")
    });

    render(<FearGreedLabel />);
    expect(screen.getByText("N/A")).toBeTruthy();
  });

  it("renders Greed state correctly", () => {
    mockUseFearGreedIndex.mockReturnValue({
      data: { value: "75", value_classification: "Greed" },
      isLoading: false,
      error: null
    });

    render(<FearGreedLabel />);
    expect(screen.getByText("75")).toBeTruthy();
    expect(screen.getByText("Greed")).toBeTruthy();
    // Check if TrendingUp icon is used (by checking test id or implied presence)
    expect(screen.getByTestId("icon-trending-up")).toBeTruthy();
  });

  it("renders Fear state correctly", () => {
    mockUseFearGreedIndex.mockReturnValue({
      data: { value: "20", value_classification: "Extreme Fear" },
      isLoading: false,
      error: null
    });

    render(<FearGreedLabel />);
    expect(screen.getByText("20")).toBeTruthy();
    expect(screen.getByText("Extreme Fear")).toBeTruthy();
    expect(screen.getByTestId("icon-trending-down")).toBeTruthy();
  });
});
