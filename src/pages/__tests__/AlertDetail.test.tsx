import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import AlertDetail from "../AlertDetail";
import { OrderSide, Exchange, DetectionType } from "../../server/types";

// Mock react-router-dom
const mockNavigate = mock();
const mockUseParams = mock(() => ({ id: "123" }));
const mockUseLocation = mock(() => ({
  state: {
    alert: {
      id: "123",
      symbol: "BTC/USDT",
      side: OrderSide.BUY,
      exchange: Exchange.BINANCE,
      timestamp: 1672531200000, // 2023-01-01 00:00:00
      detectionType: DetectionType.LARGE_TRADE,
      severity: 8,
      confidence: 0.9,
      metrics: {
        tradeQty: 10,
        tradeValue: 500000,
      },
      context: {
        midPrice: 50000,
      },
    }
  }
}));

mock.module("react-router-dom", () => ({
  useParams: mockUseParams,
  useLocation: mockUseLocation,
  useNavigate: () => mockNavigate,
}));

// Mock lucide-react icons to avoid rendering issues if any
mock.module("lucide-react", () => ({
  ArrowLeft: () => <div data-testid="icon-arrow-left" />,
  Clock: () => <div data-testid="icon-clock" />,
  DollarSign: () => <div data-testid="icon-dollar" />,
  Activity: () => <div data-testid="icon-activity" />,
}));

// Mock CustomBadge
mock.module("@/components/ui/CustomBadge", () => ({
  Badge: ({ children, variant }: any) => <div data-testid="badge" data-variant={variant}>{children}</div>
}));

// Mock shadcn UI components (simplified)
mock.module("@/components/ui/button", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>
}));
mock.module("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

describe("AlertDetail Page", () => {
  afterEach(() => {
    cleanup();
    mockNavigate.mockClear();
  });

  it("renders alert details correctly from state", () => {
    // Debug: Check if document exists
    // console.log("Document exists:", !!document);
    // console.log("Body exists:", !!document.body);
    
    render(<AlertDetail />);

    // Check Symbol
    expect(screen.getByText("BTC/USDT 吃单详情")).toBeTruthy();
    
    // Check Direction (Side)
    expect(screen.getByText("买入")).toBeTruthy();
    expect(screen.getByText("买入 (Long)")).toBeTruthy();
    
    // Check Total Amount ($500,000)
    expect(screen.getByText("$500,000")).toBeTruthy();

    // Check Time (1672531200000 -> depends on locale, but should render something)
    expect(screen.getByText("时间")).toBeTruthy();
    expect(screen.getByText("方向")).toBeTruthy();
    expect(screen.getByText("总金额")).toBeTruthy();
  });

  it("navigates back when button is clicked", () => {
    render(<AlertDetail />);
    
    const backButton = screen.getByText("返回列表");
    backButton.click();
    
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("renders not found state when no alert in state", () => {
    // Override useLocation for this test
    const originalMock = mockUseLocation;
    // @ts-ignore
    mockUseLocation.mockImplementation(() => ({ state: null }));
    
    render(<AlertDetail />);
    
    expect(screen.getByText("告警信息不存在或已过期")).toBeTruthy();
    
    // Restore
    // @ts-ignore
    mockUseLocation.mockImplementation(originalMock);
  });
});
