
import { MarketTakerDetector } from '../detector';
import { OrderBook } from '../orderbook';
import { Trade, Exchange, OrderSide, DetectionType } from '../types';
import { getPairThreshold } from '../config';

// Mock config with updated values
const mockConfig = {
  'BTC/USDT': { largeTradeQtyThreshold: 50, minSlippagePercent: 1.5, orderBookImbalanceRatio: 0.3, dailyVolumeCheckEnabled: true },
  'ETH/USDT': { largeTradeQtyThreshold: 2000, minSlippagePercent: 1.5, orderBookImbalanceRatio: 0.3, dailyVolumeCheckEnabled: true },
};

describe('MarketTakerDetector Filtering', () => {
  let detector: MarketTakerDetector;
  let orderBook: OrderBook;

  beforeEach(() => {
    // We bypass the global config getter for unit testing isolation if needed, 
    // but here we want to test the configuration compliance too.
    // However, detector takes a config object in constructor.
    detector = new MarketTakerDetector(mockConfig);
    orderBook = new OrderBook('BTC/USDT', Exchange.BINANCE);
    
    // Mock valid orderbook state to avoid unrelated errors
    orderBook.initializeFromSnapshot({
      symbol: 'BTC/USDT',
      exchange: Exchange.BINANCE,
      timestamp: Date.now(),
      lastUpdateId: 1,
      bids: [{ price: 50000, quantity: 100 }],
      asks: [{ price: 50100, quantity: 100 }],
    });
  });

  const createTrade = (symbol: string, quantity: number, side: OrderSide): Trade => ({
    symbol,
    exchange: Exchange.BINANCE,
    timestamp: Date.now(),
    tradeId: '123',
    price: 50000,
    quantity,
    side,
    isBuyerMaker: side === OrderSide.SELL, // maker is buyer -> taker is seller
  });

  describe('BTC Filtering (Threshold >= 50)', () => {
    it('should IGNORE BTC trades < 50', () => {
      const trade = createTrade('BTC/USDT', 49.99, OrderSide.BUY);
      const alert = detector.detectLargeTrade(trade, orderBook, 1000000);
      expect(alert).toBeNull();
    });

    it('should ALERT on BTC trades == 50', () => {
      const trade = createTrade('BTC/USDT', 50.0, OrderSide.BUY);
      const alert = detector.detectLargeTrade(trade, orderBook, 1000000);
      expect(alert).not.toBeNull();
      expect(alert?.metrics.tradeQty).toBe(50);
      expect(alert?.symbol).toBe('BTC/USDT');
    });

    it('should ALERT on BTC trades > 50', () => {
      const trade = createTrade('BTC/USDT', 50.01, OrderSide.SELL);
      const alert = detector.detectLargeTrade(trade, orderBook, 1000000);
      expect(alert).not.toBeNull();
      expect(alert?.metrics.tradeQty).toBe(50.01);
    });
  });

  describe('ETH Filtering (Threshold >= 2000)', () => {
    let ethOrderBook: OrderBook;

    beforeEach(() => {
       ethOrderBook = new OrderBook('ETH/USDT', Exchange.BINANCE);
       ethOrderBook.initializeFromSnapshot({
        symbol: 'ETH/USDT',
        exchange: Exchange.BINANCE,
        timestamp: Date.now(),
        lastUpdateId: 1,
        bids: [{ price: 3000, quantity: 5000 }],
        asks: [{ price: 3010, quantity: 5000 }],
      });
    });

    it('should IGNORE ETH trades < 2000', () => {
      const trade = createTrade('ETH/USDT', 1999.9, OrderSide.BUY);
      const alert = detector.detectLargeTrade(trade, ethOrderBook, 1000000);
      expect(alert).toBeNull();
    });

    it('should ALERT on ETH trades >= 2000', () => {
      const trade = createTrade('ETH/USDT', 2000, OrderSide.SELL);
      const alert = detector.detectLargeTrade(trade, ethOrderBook, 1000000);
      expect(alert).not.toBeNull();
      expect(alert?.metrics.tradeQty).toBe(2000);
    });
  });

  describe('Monitoring Dimension: Trade Direction', () => {
    it('should correctly identify BUY side', () => {
      const trade = createTrade('BTC/USDT', 100, OrderSide.BUY);
      const alert = detector.detectLargeTrade(trade, orderBook, 1000000);
      expect(alert?.side).toBe(OrderSide.BUY);
    });

    it('should correctly identify SELL side', () => {
      const trade = createTrade('BTC/USDT', 100, OrderSide.SELL);
      const alert = detector.detectLargeTrade(trade, orderBook, 1000000);
      expect(alert?.side).toBe(OrderSide.SELL);
    });
  });
});
