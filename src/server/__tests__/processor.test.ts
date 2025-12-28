import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarketDataProcessor } from '../processor';
import { Exchange, DetectionType } from '../types';

describe('MarketDataProcessor', () => {
  let processor: MarketDataProcessor;
  const symbol = 'BTC/USDT';
  const exchange = Exchange.BINANCE;

  const config = {
    symbol,
    exchange,
    pairThreshold: {
      symbol,
      largeTradeQtyThreshold: 10,
      orderBookImbalanceRatio: 0.3,
      minSlippagePercent: 1.0,
    },
    dailyVolume: 1000,
  };

  beforeEach(() => {
    processor = new MarketDataProcessor(config);
    processor.initializeOrderBook({
      symbol,
      exchange,
      timestamp: Date.now(),
      lastUpdateId: 100,
      bids: [{ price: 90000, quantity: 100 }],
      asks: [{ price: 91000, quantity: 100 }],
    });
  });

  it('should process depth updates and detect imbalance', () => {
    const alertCallback = vi.fn();
    processor.onAlert(alertCallback);

    const update = {
      symbol,
      exchange,
      timestamp: Date.now(),
      eventTime: Date.now(),
      firstUpdateId: 101,
      lastUpdateId: 101,
      bids: [['90000', '0'], ['89000', '100']], // Removed a level
      asks: [],
    };

    processor.processDepthUpdate(update);

    expect(alertCallback).toHaveBeenCalled();
    const alert = alertCallback.mock.calls[0][0];
    expect(alert.detectionType).toBe(DetectionType.ORDERBOOK_IMBALANCE);
  });

  it('should process trades and detect large trades', () => {
    const alertCallback = vi.fn();
    processor.onAlert(alertCallback);

    const trade = {
      symbol,
      exchange,
      timestamp: Date.now(),
      tradeId: 't1',
      price: 90500,
      quantity: 50, // Above 10
      side: 'BUY' as const,
      isBuyerMaker: false,
    };

    processor.processTrade(trade);

    expect(alertCallback).toHaveBeenCalled();
    const alert = alertCallback.mock.calls[0][0];
    expect(alert.detectionType).toBe(DetectionType.LARGE_TRADE);
  });

  it('should maintain stats', () => {
    processor.processTrade({
      symbol, exchange, timestamp: Date.now(), tradeId: 't1',
      price: 90500, quantity: 1, side: 'BUY', isBuyerMaker: false
    });

    const stats = processor.getStats();
    expect(stats.totalTrades).toBe(1);
  });

  it('should perform health checks', () => {
    // Should be unhealthy initially because no updates yet
    expect(processor.healthCheck().healthy).toBe(false);
    
    // Process an update to set lastUpdateTime
    processor.processTrade({
      symbol, exchange, timestamp: Date.now(), tradeId: 't1',
      price: 90500, quantity: 1, side: 'BUY', isBuyerMaker: false
    });
    
    expect(processor.healthCheck().healthy).toBe(true);
  });

  it('should validate against remote snapshot', () => {
    const remoteSnapshot = {
      symbol,
      exchange,
      timestamp: Date.now(),
      lastUpdateId: 100,
      bids: [{ price: 90000, quantity: 100 }],
      asks: [{ price: 91000, quantity: 100 }],
    };

    expect(processor.validateAgainstSnapshot(remoteSnapshot)).toBe(true);

    const wrongSnapshot = {
      ...remoteSnapshot,
      bids: [{ price: 80000, quantity: 100 }],
    };
    expect(processor.validateAgainstSnapshot(wrongSnapshot)).toBe(false);
  });
});
