import { describe, it, expect, mock, beforeEach } from "bun:test";
import { renderHook } from "@testing-library/react";
// Import hook AFTER mocking (dynamic import or just rely on hoisting if using jest, but bun mock.module works differently)
// Actually in Bun, we define mock.module before importing.

const mockUseBinanceTicker = mock(() => ({
  tickers: {
    'BTC/USDT': { price: 50000, changePercent: 2.0, quoteVolume: 1000000000 }, // 1B Volume
    'ETH/USDT': { price: 3000, changePercent: 1.0, quoteVolume: 500000000 },  // 0.5B Volume
    'ETH/BTC': { price: 0.06, changePercent: -1.5, quoteVolume: 1000 },
  },
  status: 'CONNECTED'
}));

mock.module("../useBinanceTicker", () => ({
  useBinanceTicker: mockUseBinanceTicker
}));

import { useGlobalStats } from "../useGlobalStats";

describe("useGlobalStats", () => {
  beforeEach(() => {
    mockUseBinanceTicker.mockClear();
  });

  it("should return formatted global stats based on ticker data", () => {
    // Setup the mock return value for this specific test
    mockUseBinanceTicker.mockReturnValue({
      tickers: {
        'BTC/USDT': { price: 100000, changePercent: 5.0, quoteVolume: 1000000000 },
        'ETH/BTC': { price: 0.05, changePercent: 1.2, quoteVolume: 1000 },
        'ETH/USDT': { price: 4000, changePercent: 3.0, quoteVolume: 500000000 }
      },
      status: 'CONNECTED'
    });

    const { result } = renderHook(() => useGlobalStats());

    const { stats, status } = result.current;
    
    expect(status).toBe('CONNECTED');
    expect(stats.length).toBe(4);

    // 1. ETH/BTC
    const ethBtc = stats.find(s => s.label === 'ETH/BTC');
    expect(ethBtc).toBeDefined();
    expect(ethBtc?.value).toBe("0.05000");
    expect(ethBtc?.change).toBe("+1.20%");

    // 2. BTC.D (Simulated: Base 54.2 + BTC Change * 0.05)
    // BTC Change = 5.0 -> +0.25 -> 54.45
    const btcDom = stats.find(s => s.label === 'BTC.D');
    expect(btcDom?.value).toBe("54.5%"); // 54.2 + 0.25 = 54.45 -> rounds to 54.5? toFixed(1) -> 54.5 if 54.45? 
    // Wait: 54.2 + 0.25 = 54.45. toFixed(1) usually rounds half up? Let's see.

    // 3. Market Cap (Simulated: Base 3.42T * (1 + 5.0 * 0.8 / 100))
    // 5.0 * 0.8 = 4.0%. 3.42 * 1.04 = 3.5568
    const mcap = stats.find(s => s.label === '总市值');
    expect(mcap?.value).toBe("$3.56T");

    // 4. Volume (Sum of USDT pairs * Factor)
    // Sum = 1B + 0.5B = 1.5B
    // Factor = 15
    // Display = 22.5B
    const volume = stats.find(s => s.label === '24h成交');
    expect(volume?.value).toBe("$22.50B");
  });

  it("should handle loading state", () => {
    mockUseBinanceTicker.mockReturnValue({
      tickers: {},
      status: 'CONNECTING'
    });

    const { result } = renderHook(() => useGlobalStats());
    
    expect(result.current.status).toBe('CONNECTING');
    expect(result.current.stats[0].value).toBe("Loading...");
  });
});
