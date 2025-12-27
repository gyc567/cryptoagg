import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useLargeTransfers } from "../useLargeTransfers";

// Capture instances
let wsInstances: MockWebSocket[] = [];

class MockWebSocket {
  onopen: () => void = () => {};
  onmessage: (event: any) => void = () => {};
  onclose: () => void = () => {};
  onerror: (error: any) => void = () => {};
  close: () => void = mock();
  send: () => void = mock();
  readyState: number = 1;

  constructor(public url: string) {
    wsInstances.push(this);
    setTimeout(() => this.onopen(), 10);
  }
}

describe("useLargeTransfers", () => {
  let originalWebSocket: any;

  beforeEach(() => {
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket as any;
    wsInstances = [];
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
  });

  it("should connect and process large trades", async () => {
    const { result, unmount } = renderHook(() => useLargeTransfers({ 
        threshold: 10000000, 
        symbols: ['BTCUSDT'] 
    }));

    await waitFor(() => {
      expect(result.current.status).toBe("CONNECTED");
    });

    const ws = wsInstances[0];
    expect(ws).toBeDefined();

    // Simulate Large Trade
    // Value = 100000 * 150 = 15,000,000 > 10,000,000
    // m = false (Buyer is Taker -> Buy / In)
    const largeTrade = {
      data: {
        e: 'aggTrade',
        E: 123456789,
        s: 'BTCUSDT',
        a: 1,
        p: '100000.00',
        q: '150.00',
        T: Date.now(),
        m: false 
      }
    };

    act(() => {
      ws.onmessage({ data: JSON.stringify(largeTrade) } as any);
    });

    // Wait for buffer flush (500ms)
    await waitFor(() => {
        expect(result.current.transfers.length).toBeGreaterThan(0);
    }, { timeout: 2000 });

    const transfer = result.current.transfers[0];
    expect(transfer.amount).toBe(150);
    expect(transfer.currency).toBe('BTC');
    expect(transfer.direction).toBe('in'); // Buy
    expect(transfer.toAddress).toBe('Binance User'); 
    expect(transfer.fromAddress).toBe('Binance Hot Wallet');

    unmount();
  });

  it("should ignore small trades", async () => {
    const { result, unmount } = renderHook(() => useLargeTransfers({ 
        threshold: 10000000, 
        symbols: ['BTCUSDT'] 
    }));

    await waitFor(() => {
      expect(result.current.status).toBe("CONNECTED");
    });

    const ws = wsInstances[0];

    // Value = 100000 * 50 = 5,000,000 < 10,000,000
    const smallTrade = {
      data: {
        e: 'aggTrade',
        s: 'BTCUSDT',
        p: '100000.00',
        q: '50.00',
        m: false
      }
    };

    act(() => {
      ws.onmessage({ data: JSON.stringify(smallTrade) } as any);
    });

    // Wait and check it didn't update (wait slightly longer than flush timer)
    await new Promise(r => setTimeout(r, 600)); 
    expect(result.current.transfers.length).toBe(0);

    unmount();
  });

  it("should use default threshold of 10M", async () => {
    // No threshold passed, should use 10,000,000
    const { result, unmount } = renderHook(() => useLargeTransfers({ 
        symbols: ['BTCUSDT'] 
    }));

    await waitFor(() => {
      expect(result.current.status).toBe("CONNECTED");
    });

    const ws = wsInstances[0];

    // Value = 5,000,000 < 10,000,000 (Should be ignored)
    const midTrade = {
      data: {
        e: 'aggTrade',
        s: 'BTCUSDT',
        p: '100000.00',
        q: '50.00',
        T: Date.now(),
        m: false
      }
    };

    // Value = 11,000,000 > 10,000,000 (Should be captured)
    const hugeTrade = {
      data: {
        e: 'aggTrade',
        s: 'BTCUSDT',
        p: '100000.00',
        q: '110.00',
        T: Date.now() + 100,
        m: false
      }
    };

    act(() => {
      ws.onmessage({ data: JSON.stringify(midTrade) } as any);
      ws.onmessage({ data: JSON.stringify(hugeTrade) } as any);
    });

    await waitFor(() => {
        expect(result.current.transfers.length).toBe(1);
    }, { timeout: 2000 });

    expect(result.current.transfers[0].amount).toBe(110);

    unmount();
  });
});
