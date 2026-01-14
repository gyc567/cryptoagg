import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarketDataManager } from '../manager';
import { Exchange } from '../types';

// Mock BinanceWSClient
vi.mock('../binance', () => {
  return {
    BinanceWSClient: vi.fn().mockImplementation(() => {
      return {
        connect: vi.fn().mockResolvedValue(undefined),
        subscribeToDepth: vi.fn(),
        subscribeToTrade: vi.fn(),
        get24hTicker: vi.fn().mockResolvedValue(1000000),
        getDepthSnapshot: vi.fn().mockResolvedValue({
          symbol: 'BTC/USDT',
          exchange: 'BINANCE',
          timestamp: Date.now(),
          lastUpdateId: 100,
          bids: [{ price: 90000, quantity: 1 }],
          asks: [{ price: 91000, quantity: 1 }],
        }),
        isConnected: vi.fn().mockReturnValue(true),
        disconnect: vi.fn(),
      };
    }),
  };
});

describe('MarketDataManager', () => {
  let manager: MarketDataManager;
  const symbols = ['BTC/USDT'];

  beforeEach(() => {
    manager = new MarketDataManager({
      binance: {
        enabled: true,
        symbols,
        isTestMode: true,
      },
    });
  });

  it('should initialize and subscribe to data sources', async () => {
    await manager.initialize();
    
    const processor = manager.getProcessor('BTC/USDT');
    expect(processor).not.toBeNull();
    
    expect(manager.healthCheck().binance.connected).toBe(true);
  });

  it('should handle alerts from processors', async () => {
    await manager.initialize();
    const alertCallback = vi.fn();
    manager.onAlert(alertCallback);

    const processor = manager.getProcessor('BTC/USDT');
    // Manual trigger for testing
    (processor as any).emitAlert({
      id: 'test-alert',
      symbol: 'BTC/USDT',
      severity: 5,
    });

    expect(alertCallback).toHaveBeenCalledWith(expect.objectContaining({
      id: 'test-alert',
    }));
  });

  it('should shutdown correctly', async () => {
    await manager.initialize();
    manager.shutdown();
    // Verify timers are cleared or mock client is disconnected
  });
});
