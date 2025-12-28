import { describe, it, expect, beforeEach } from 'vitest';
import { MarketTakerDetector } from '../detector';
import { OrderBook } from '../orderbook';
import { Exchange, OrderSide, DetectionType } from '../types';

describe('MarketTakerDetector', () => {
  let detector: MarketTakerDetector;
  let orderBook: OrderBook;
  const symbol = 'BTC/USDT';
  const exchange = Exchange.BINANCE;

  const config = {
    [symbol]: {
      symbol,
      largeTradeQtyThreshold: 10, // 10 BTC
      orderBookImbalanceRatio: 0.3,
      minSlippagePercent: 1.0,
    },
  };

  beforeEach(() => {
    detector = new MarketTakerDetector(config);
    orderBook = new OrderBook(symbol, exchange);
    orderBook.initializeFromSnapshot({
      symbol,
      exchange,
      timestamp: Date.now(),
      lastUpdateId: 100,
      bids: [
        { price: 90000, quantity: 100 },
        { price: 89900, quantity: 100 },
      ],
      asks: [
        { price: 90100, quantity: 100 },
        { price: 90200, quantity: 100 },
      ],
    });
  });

  it('should detect large trades', () => {
    const trade = {
      symbol,
      exchange,
      timestamp: Date.now(),
      tradeId: 't1',
      price: 90100,
      quantity: 15, // Above threshold of 10
      side: 'BUY' as const,
      isBuyerMaker: false,
    };

    const dailyVolume = 1000;
    const alert = detector.detectLargeTrade(trade, orderBook, dailyVolume);

    expect(alert).not.toBeNull();
    expect(alert?.detectionType).toBe(DetectionType.LARGE_TRADE);
    expect(alert?.metrics.tradeQty).toBe(15);
  });

  it('should not detect small trades', () => {
    const trade = {
      symbol,
      exchange,
      timestamp: Date.now(),
      tradeId: 't1',
      price: 90100,
      quantity: 5, // Below threshold
      side: 'BUY' as const,
      isBuyerMaker: false,
    };

    const alert = detector.detectLargeTrade(trade, orderBook, 1000);
    expect(alert).toBeNull();
  });

  it('should detect orderbook imbalance', () => {
    const prevSnapshot = orderBook.getSnapshot();
    
    // Simulate depth removal
    orderBook.applyDepthUpdate({
      symbol,
      exchange,
      timestamp: Date.now(),
      eventTime: Date.now(),
      firstUpdateId: 101,
      lastUpdateId: 101,
      bids: [
        ['90000', '0'],
        ['89900', '0'],
      ],
      asks: [],
    });

    const currentSnapshot = orderBook.getSnapshot();
    const alert = detector.detectOrderbookImbalance(
      prevSnapshot,
      currentSnapshot,
      orderBook,
      {
        symbol,
        exchange,
        timestamp: Date.now(),
        eventTime: Date.now(),
        firstUpdateId: 101,
        lastUpdateId: 101,
        bids: [],
        asks: [],
      }
    );

    expect(alert).not.toBeNull();
    expect(alert?.detectionType).toBe(DetectionType.ORDERBOOK_IMBALANCE);
  });

  it('should detect slippage spikes', () => {
    // Current mid price is 90050
    // Asks: 90100 (100), 90200 (100)
    // If we buy 500 units (more than available), slippage will be high
    const alert = detector.detectSlippageSpike(orderBook, symbol, OrderSide.BUY, 500);

    expect(alert).not.toBeNull();
    expect(alert?.detectionType).toBe(DetectionType.SLIPPAGE_SPIKE);
    expect(alert?.metrics.slippagePercent).toBe(999);
  });

  it('should synthesize multiple alerts', () => {
    const alert1 = {
      id: 'a1',
      timestamp: Date.now(),
      exchange,
      symbol,
      side: OrderSide.BUY,
      detectionType: DetectionType.LARGE_TRADE,
      severity: 6,
      confidence: 0.8,
      metrics: {},
      context: {},
    } as any;

    const alert2 = {
      id: 'a2',
      timestamp: Date.now(),
      exchange,
      symbol,
      side: OrderSide.BUY,
      detectionType: DetectionType.SLIPPAGE_SPIKE,
      severity: 7,
      confidence: 0.85,
      metrics: {},
      context: {},
    } as any;

    const finalAlert = detector.synthesizeAlerts([alert1, alert2]);
    expect(finalAlert).not.toBeNull();
    expect(finalAlert?.severity).toBe(8); // Increased severity
    expect(finalAlert?.confidence).toBeGreaterThan(0.85);
  });

  it('should respect alert window for deduplication', () => {
    const trade = {
      symbol,
      exchange,
      timestamp: Date.now(),
      tradeId: 't1',
      price: 90100,
      quantity: 15,
      side: 'BUY' as const,
      isBuyerMaker: false,
    };

    const alert1 = detector.detectLargeTrade(trade, orderBook, 1000);
    expect(alert1).not.toBeNull();

    const alert2 = detector.detectLargeTrade(trade, orderBook, 1000);
    expect(alert2).toBeNull(); // Deduplicated
  });
});
