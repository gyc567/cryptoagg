/**
 * 市场数据处理器
 *
 * 职责：
 * - 管理与交易所WebSocket的连接
 * - 维护多币对的订单簿
 * - 触发检测器进行异常检测
 * - 发出告警事件
 *
 * 架构设计：
 * - 使用事件驱动模式
 * - 支持多币对并行监控
 * - 自动重连和容错
 */

import { OrderBook } from './orderbook';
import { MarketTakerDetector } from './detector';
import {
  Trade,
  DepthUpdate,
  MarketTakerAlert,
  OrderBookSnapshot,
  Exchange,
  DetectionConfig,
  PairThreshold,
} from './types';

export interface MarketDataProcessorConfig {
  symbol: string;
  exchange: Exchange;
  pairThreshold: PairThreshold;
  dailyVolume: number;
}

type AlertListener = (alert: MarketTakerAlert) => void;
type TradeListener = (trade: Trade) => void;
type DepthListener = (update: DepthUpdate) => void;

/**
 * 市场数据处理器
 *
 * 管理单个币对的订单簿和检测
 */
export class MarketDataProcessor {
  private orderBook: OrderBook;
  private detector: MarketTakerDetector;
  private previousSnapshot: OrderBookSnapshot | null = null;
  private recentTrades: Trade[] = [];
  private maxRecentTrades: number = 100;

  // 事件监听器
  private alertListeners: AlertListener[] = [];
  private tradeListeners: TradeListener[] = [];
  private depthListeners: DepthListener[] = [];

  // 统计信息
  private stats = {
    totalDepthUpdates: 0,
    totalTrades: 0,
    totalAlerts: 0,
    lastUpdateTime: 0,
  };

  constructor(private config: MarketDataProcessorConfig) {
    this.orderBook = new OrderBook(config.symbol, config.exchange);
    this.detector = new MarketTakerDetector({
      [config.symbol]: config.pairThreshold,
    });
  }

  /**
   * 初始化订单簿快照
   *
   * 这应该在订阅WebSocket数据流之前调用
   */
  initializeOrderBook(snapshot: OrderBookSnapshot): void {
    if (!this.orderBook.isValid()) {
      throw new Error('OrderBook validation failed during initialization');
    }
    this.orderBook.initializeFromSnapshot(snapshot);
    this.previousSnapshot = snapshot;
  }

  /**
   * 更新日均成交量
   */
  updateDailyVolume(volume: number): void {
    this.config.dailyVolume = volume;
  }

  /**
   * 校验本地订单簿是否与远程快照一致
   */
  validateAgainstSnapshot(snapshot: OrderBookSnapshot): boolean {
    const localSnapshot = this.orderBook.getSnapshot();
    
    // 简单的最佳买卖价对比
    const localBestBid = localSnapshot.bids[0]?.price || 0;
    const remoteBestBid = snapshot.bids[0]?.price || 0;
    const localBestAsk = localSnapshot.asks[0]?.price || 0;
    const remoteBestAsk = snapshot.asks[0]?.price || 0;
    
    // 允许非常小的误差（浮点数）
    const epsilon = 0.0000001;
    
    const bidMatch = Math.abs(localBestBid - remoteBestBid) < epsilon;
    const askMatch = Math.abs(localBestAsk - remoteBestAsk) < epsilon;
    
    if (!bidMatch || !askMatch) {
      console.warn(`[${this.config.symbol}] OrderBook validation failed!`);
      console.warn(`Local: Bid=${localBestBid}, Ask=${localBestAsk}`);
      console.warn(`Remote: Bid=${remoteBestBid}, Ask=${remoteBestAsk}`);
      return false;
    }
    
    return true;
  }

  /**
   * 处理深度更新
   *
   * 流程：
   * 1. 保存前一状态
   * 2. 应用新更新
   * 3. 检测订单簿失衡
   * 4. 发送事件
   */
  processDepthUpdate(update: DepthUpdate): void {
    // 保存前一个快照
    const prevSnapshot = this.previousSnapshot
      ? { ...this.previousSnapshot }
      : null;

    // 应用更新
    const result = this.orderBook.applyDepthUpdate(update);
    if (!result.success) {
      // 乱序或缝隙，可能需要重新初始化
      console.warn(`[${this.config.symbol}] Depth update failed: ${result.reason}`);
      return;
    }

    // 获取当前快照
    const currentSnapshot = this.orderBook.getSnapshot();

    // 检测订单簿失衡
    if (prevSnapshot) {
      const imbalanceAlert = this.detector.detectOrderbookImbalance(
        prevSnapshot,
        currentSnapshot,
        this.orderBook,
        update
      );

      if (imbalanceAlert) {
        this.emitAlert(imbalanceAlert);
      }
    }

    // 更新状态
    this.previousSnapshot = currentSnapshot;
    this.stats.totalDepthUpdates++;
    this.stats.lastUpdateTime = Date.now();

    // 触发事件监听器
    this.depthListeners.forEach((listener) => listener(update));
  }

  /**
   * 处理成交数据
   *
   * 流程：
   * 1. 检测大额成交
   * 2. 检测滑点异常
   * 3. 综合评分
   * 4. 发送告警
   */
  processTrade(trade: Trade): void {
    // 维持最近成交列表
    this.recentTrades.push(trade);
    if (this.recentTrades.length > this.maxRecentTrades) {
      this.recentTrades.shift();
    }

    // 检测大额成交
    const largeTradeAlert = this.detector.detectLargeTrade(
      trade,
      this.orderBook,
      this.config.dailyVolume
    );

    // 检测滑点异常（使用成交量作为参考）
    const slippageAlert = this.detector.detectSlippageSpike(
      this.orderBook,
      this.config.symbol,
      trade.side,
      trade.quantity
    );

    // 综合评分
    const finalAlert = this.detector.synthesizeAlerts([largeTradeAlert, slippageAlert]);

    if (finalAlert) {
      this.emitAlert(finalAlert);
    }

    this.stats.totalTrades++;
    this.stats.lastUpdateTime = Date.now();

    // 触发事件监听器
    this.tradeListeners.forEach((listener) => listener(trade));
  }

  /**
   * 订阅告警事件
   */
  onAlert(listener: AlertListener): () => void {
    this.alertListeners.push(listener);
    return () => {
      this.alertListeners = this.alertListeners.filter((l) => l !== listener);
    };
  }

  /**
   * 订阅成交事件
   */
  onTrade(listener: TradeListener): () => void {
    this.tradeListeners.push(listener);
    return () => {
      this.tradeListeners = this.tradeListeners.filter((l) => l !== listener);
    };
  }

  /**
   * 订阅深度更新事件
   */
  onDepthUpdate(listener: DepthListener): () => void {
    this.depthListeners.push(listener);
    return () => {
      this.depthListeners = this.depthListeners.filter((l) => l !== listener);
    };
  }

  /**
   * 获取当前订单簿快照
   */
  getOrderBookSnapshot(): OrderBookSnapshot {
    return this.orderBook.getSnapshot();
  }

  /**
   * 获取处理器统计信息
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 获取最近的成交
   */
  getRecentTrades(count: number = 10): Trade[] {
    return this.recentTrades.slice(-count);
  }

  /**
   * 健康检查
   */
  healthCheck(): { healthy: boolean; reason?: string } {
    if (!this.orderBook.isValid()) {
      return {
        healthy: false,
        reason: 'OrderBook validation failed',
      };
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - this.stats.lastUpdateTime;

    if (timeSinceLastUpdate > 30000) {
      // 30秒没有数据
      return {
        healthy: false,
        reason: `No data for ${timeSinceLastUpdate}ms`,
      };
    }

    return { healthy: true };
  }

  private emitAlert(alert: MarketTakerAlert): void {
    this.stats.totalAlerts++;
    this.alertListeners.forEach((listener) => {
      try {
        listener(alert);
      } catch (error) {
        console.error('Error in alert listener:', error);
      }
    });
  }
}

/**
 * 市场数据处理器池
 *
 * 管理多个币对的处理器
 */
export class MarketDataProcessorPool {
  private processors: Map<string, MarketDataProcessor> = new Map();
  private alertListeners: AlertListener[] = [];

  /**
   * 添加币对处理器
   */
  addProcessor(
    symbol: string,
    config: MarketDataProcessorConfig
  ): MarketDataProcessor {
    const processor = new MarketDataProcessor(config);

    // 将所有告警转发给全局监听器
    processor.onAlert((alert) => {
      this.alertListeners.forEach((listener) => {
        try {
          listener(alert);
        } catch (error) {
          console.error('Error in global alert listener:', error);
        }
      });
    });

    this.processors.set(symbol, processor);
    return processor;
  }

  /**
   * 获取特定币对的处理器
   */
  getProcessor(symbol: string): MarketDataProcessor | null {
    return this.processors.get(symbol) || null;
  }

  /**
   * 订阅所有告警
   */
  onAlert(listener: AlertListener): () => void {
    this.alertListeners.push(listener);
    return () => {
      this.alertListeners = this.alertListeners.filter((l) => l !== listener);
    };
  }

  /**
   * 获取所有处理器的统计信息
   */
  getAllStats() {
    const stats: Record<string, any> = {};
    this.processors.forEach((processor, symbol) => {
      stats[symbol] = processor.getStats();
    });
    return stats;
  }

  /**
   * 健康检查
   */
  healthCheck(): {
    healthy: boolean;
    processors: Record<string, { healthy: boolean; reason?: string }>;
  } {
    const processors: Record<string, { healthy: boolean; reason?: string }> = {};
    let overallHealthy = true;

    this.processors.forEach((processor, symbol) => {
      const check = processor.healthCheck();
      processors[symbol] = check;
      if (!check.healthy) {
        overallHealthy = false;
      }
    });

    return {
      healthy: overallHealthy,
      processors,
    };
  }
}
