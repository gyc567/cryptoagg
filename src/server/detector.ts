/**
 * 市价吃单检测器
 *
 * 职责：
 * - 检测大额成交
 * - 检测订单簿失衡
 * - 检测滑点异常
 * - 综合评分和告警生成
 *
 * 设计原则：
 * - 单一职责：只负责检测，不负责持久化
 * - 防守：多维度综合判断，降低误报
 * - 可配置：所有阈值都是参数，便于AB测试
 */

// 本地简单ID生成器，避免额外依赖
import {
  Trade,
  DepthUpdate,
  OrderBookSnapshot,
  MarketTakerAlert,
  MarketTakerAlertMetrics,
  DetectionType,
  OrderSide,
  Severity,
  PairThreshold,
} from './types';
import { OrderBook } from './orderbook';

export interface DetectorContext {
  symbol: string;
  previousSnapshot: OrderBookSnapshot;
  currentSnapshot: OrderBookSnapshot;
  recentTrades: Trade[];
  dailyVolume: number;
}

export class MarketTakerDetector {
  private lastAlertTime: Map<string, number> = new Map(); // symbol -> timestamp
  private alertWindow: number = 1000; // 1秒内相同告警去重

  constructor(private config: Record<string, PairThreshold>) {}

  /**
   * 检测大额成交
   *
   * 原理：
   * - 单笔成交量 > 币对阈值 → 可能是吃单
   * - 计算成交额相对日均成交的比例
   * - 结合成交方向判断风险
   */
  detectLargeTrade(
    trade: Trade,
    orderBook: OrderBook,
    dailyVolume: number
  ): MarketTakerAlert | null {
    const threshold = this.config[trade.symbol];
    if (!threshold) return null;

    // 检查是否超过阈值
    if (trade.quantity < threshold.largeTradeQtyThreshold) {
      return null;
    }

    const snapshot = orderBook.getSnapshot();
    const midPrice = orderBook.getMidPrice();
    const tradeValue = trade.quantity * trade.price;
    const volumeRatio = dailyVolume > 0 ? trade.quantity / dailyVolume : 0;

    // 风险评分：基于成交量相对日均的倍数
    let severity: Severity = 5;
    if (volumeRatio > 1.0) severity = 9;
    else if (volumeRatio > 0.5) severity = 8;
    else if (volumeRatio > 0.2) severity = 7;
    else if (volumeRatio > 0.1) severity = 6;

    const alert: MarketTakerAlert = {
      id: this.generateAlertId(),
      timestamp: trade.timestamp,
      exchange: trade.exchange,
      symbol: trade.symbol,
      side: trade.side,
      detectionType: DetectionType.LARGE_TRADE,
      severity,
      confidence: Math.min(0.95, 0.7 + volumeRatio * 0.2),
      metrics: {
        tradeQty: trade.quantity,
        tradeValue,
        volumeRatioVsDailyAvg: volumeRatio,
      },
      context: {
        midPrice,
        spread: orderBook.getSpread(),
        bidDepth5: this.sumDepth(snapshot.bids, 5),
        askDepth5: this.sumDepth(snapshot.asks, 5),
      },
    };

    return this.shouldEmitAlert(trade.symbol, alert) ? alert : null;
  }

  /**
   * 检测订单簿失衡
   *
   * 原理：
   * - 单次更新删除超过阈值的档位 → 流动性被吃掉了
   * - 点差突变（spread spike） → 价格波动剧烈
   * - 综合这两个信号判断是否失衡
   */
  detectOrderbookImbalance(
    previousSnapshot: OrderBookSnapshot,
    currentSnapshot: OrderBookSnapshot,
    orderBook: OrderBook,
    depthUpdate: DepthUpdate
  ): MarketTakerAlert | null {
    const threshold = this.config[currentSnapshot.symbol];
    if (!threshold) return null;

    const imbalance = orderBook.detectImbalance(
      previousSnapshot,
      threshold.orderBookImbalanceRatio
    );

    if (!imbalance.imbalanced) {
      return null;
    }

    const previousSpread =
      (previousSnapshot.asks[0]?.price || 0) - (previousSnapshot.bids[0]?.price || 0);
    const currentSpread = orderBook.getSpread();

    // 风险评分：基于删除档位比例和spread变化
    const removedRatio =
      (imbalance.metrics.bidLevelsRemoved + imbalance.metrics.askLevelsRemoved) /
      (previousSnapshot.bids.length + previousSnapshot.asks.length);

    let severity: Severity = 5;
    if (removedRatio > 0.5) severity = 9;
    else if (removedRatio > 0.3) severity = 8;
    else if (removedRatio > 0.15) severity = 7;
    else severity = 6;

    const midPrice = orderBook.getMidPrice();

    const alert: MarketTakerAlert = {
      id: this.generateAlertId(),
      timestamp: depthUpdate.timestamp,
      exchange: depthUpdate.exchange,
      symbol: depthUpdate.symbol,
      side: imbalance.metrics.askLevelsRemoved > imbalance.metrics.bidLevelsRemoved
        ? OrderSide.BUY
        : OrderSide.SELL,
      detectionType: DetectionType.ORDERBOOK_IMBALANCE,
      severity,
      confidence: Math.min(0.9, 0.5 + removedRatio),
      metrics: {
        orderBookDepthConsumed:
          imbalance.metrics.bidLevelsRemoved + imbalance.metrics.askLevelsRemoved,
      },
      context: {
        midPrice,
        spread: currentSpread,
        bidDepth5: this.sumDepth(currentSnapshot.bids, 5),
        askDepth5: this.sumDepth(currentSnapshot.asks, 5),
      },
    };

    return this.shouldEmitAlert(depthUpdate.symbol, alert) ? alert : null;
  }

  /**
   * 检测滑点异常
   *
   * 原理：
   * - 模拟市价单执行，检查平均价格与中间价的偏离
   * - 超过阈值 → 流动性不足或订单簿被扫
   * - 多档位检测（5档、10档、20档）
   */
  detectSlippageSpike(
    orderBook: OrderBook,
    symbol: string,
    side: OrderSide,
    quantity: number,
    depthLevels: number[] = [5, 10, 20]
  ): MarketTakerAlert | null {
    const threshold = this.config[symbol];
    if (!threshold) return null;

    let maxSlippage = 0;
    let worstDepthLevel = 0;

    // 检查多个深度档位
    for (const depth of depthLevels) {
      const result = orderBook.calculateSlippage(side, quantity, depth);
      if (result.slippagePercent > maxSlippage) {
        maxSlippage = result.slippagePercent;
        worstDepthLevel = result.consumedDepthLevels;
      }
    }

    // 检查是否超过阈值
    if (maxSlippage < threshold.minSlippagePercent) {
      return null;
    }

    // 风险评分：基于滑点百分比
    let severity: Severity = 5;
    if (maxSlippage > 5) severity = 9;
    else if (maxSlippage > 3) severity = 8;
    else if (maxSlippage > 1.5) severity = 7;
    else severity = 6;

    const snapshot = orderBook.getSnapshot();
    const midPrice = orderBook.getMidPrice();

    const alert: MarketTakerAlert = {
      id: this.generateAlertId(),
      timestamp: Date.now(),
      exchange: snapshot.exchange,
      symbol: snapshot.symbol,
      side,
      detectionType: DetectionType.SLIPPAGE_SPIKE,
      severity,
      confidence: Math.min(0.95, Math.max(0.6, maxSlippage / 10)),
      metrics: {
        slippagePercent: maxSlippage,
        orderBookDepthConsumed: worstDepthLevel,
      },
      context: {
        midPrice,
        spread: orderBook.getSpread(),
        bidDepth5: this.sumDepth(snapshot.bids, 5),
        askDepth5: this.sumDepth(snapshot.asks, 5),
      },
    };

    return this.shouldEmitAlert(snapshot.symbol, alert) ? alert : null;
  }

  /**
   * 综合评分器
   *
   * 将多个检测结果综合，生成最终的风险评分
   * 使用加权平均：
   * - 大额成交：40%
   * - 订单簿失衡：35%
   * - 滑点异常：25%
   */
  synthesizeAlerts(alerts: (MarketTakerAlert | null)[]): MarketTakerAlert | null {
    const validAlerts = alerts.filter((a) => a !== null) as MarketTakerAlert[];

    if (validAlerts.length === 0) return null;

    // 如果有多个告警，选择最严重的，然后调整severity
    const mainAlert = validAlerts.reduce((a, b) => (a.severity > b.severity ? a : b));

    // 如果有多个维度的告警，提高置信度和severity
    if (validAlerts.length > 1) {
      mainAlert.confidence = Math.min(0.99, mainAlert.confidence * 1.2);
      mainAlert.severity = Math.min(10, mainAlert.severity + 1) as Severity;
    }

    return mainAlert;
  }

  /**
   * 防守机制：告警去重
   *
   * 在短时间窗口内，相同symbol的告警合并
   * 防止告警爆炸
   */
  private shouldEmitAlert(symbol: string, alert: MarketTakerAlert): boolean {
    const now = Date.now();
    const lastAlert = this.lastAlertTime.get(symbol);

    if (lastAlert && now - lastAlert < this.alertWindow) {
      return false; // 窗口内已发送过告警
    }

    this.lastAlertTime.set(symbol, now);
    return true;
  }

  private generateAlertId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `alert_${timestamp}_${random}`;
  }

  private sumDepth(levels: { price: number; quantity: number }[], count: number): number {
    return levels.slice(0, count).reduce((sum, level) => sum + level.quantity, 0);
  }
}
