/**
 * 订单簿管理器
 *
 * 职责：
 * - 维护本地订单簿快照
 * - 应用增量更新（diff depth）
 * - 计算滑点和深度信息
 * - 检测订单簿失衡
 *
 * 设计原则（Linus风格）：
 * - 简洁：只做一件事 = 订单簿数据的维护
 * - 防守：所有输入都要验证（乱序、负数等）
 * - 高效：使用Map而非Array，O(1)查找
 */

import {
  PriceLevel,
  OrderBookSnapshot,
  DepthUpdate,
  Exchange,
  OrderSide,
} from './types';

export class OrderBook {
  private symbol: string;
  private exchange: Exchange;
  private bids: Map<number, number> = new Map(); // price -> quantity
  private asks: Map<number, number> = new Map();
  private lastUpdateId: number = 0;
  private timestamp: number = 0;
  private maxDepthSize: number = 500; // 防止内存爆炸

  constructor(symbol: string, exchange: Exchange) {
    this.symbol = symbol;
    this.exchange = exchange;
  }

  /**
   * 初始化订单簿快照
   */
  initializeFromSnapshot(snapshot: OrderBookSnapshot): void {
    if (snapshot.symbol !== this.symbol || snapshot.exchange !== this.exchange) {
      throw new Error('Snapshot mismatch with OrderBook symbol/exchange');
    }

    this.bids.clear();
    this.asks.clear();

    // 应用初始bids
    for (const level of snapshot.bids) {
      if (level.quantity > 0) {
        this.bids.set(level.price, level.quantity);
      }
    }

    // 应用初始asks
    for (const level of snapshot.asks) {
      if (level.quantity > 0) {
        this.asks.set(level.price, level.quantity);
      }
    }

    this.lastUpdateId = snapshot.lastUpdateId;
    this.timestamp = snapshot.timestamp;
  }

  /**
   * 应用深度增量更新
   *
   * 错误处理：
   * - 丢弃乱序更新（updateId < lastUpdateId）
   * - 等待延迟更新（缓冲乱序消息）
   * - 返回是否成功应用
   */
  applyDepthUpdate(update: DepthUpdate): {
    success: boolean;
    reason?: string;
  } {
    // 检查更新序号连续性
    if (update.firstUpdateId > this.lastUpdateId + 1) {
      // 存在缝隙，需要重新初始化或缓冲等待
      return {
        success: false,
        reason: `Gap detected: expected ${this.lastUpdateId + 1}, got ${update.firstUpdateId}`,
      };
    }

    if (update.lastUpdateId <= this.lastUpdateId) {
      // 这是一个旧更新，丢弃
      return {
        success: false,
        reason: 'Update is older than current state',
      };
    }

    // 应用bid更新
    for (const [priceStr, qtyStr] of update.bids) {
      const price = parseFloat(priceStr);
      const qty = parseFloat(qtyStr);

      if (qty === 0) {
        this.bids.delete(price);
      } else if (qty > 0) {
        this.bids.set(price, qty);
      }
    }

    // 应用ask更新
    for (const [priceStr, qtyStr] of update.asks) {
      const price = parseFloat(priceStr);
      const qty = parseFloat(qtyStr);

      if (qty === 0) {
        this.asks.delete(price);
      } else if (qty > 0) {
        this.asks.set(price, qty);
      }
    }

    // 防止内存泄漏：删除极价格（防守设计）
    this.pruneExtremeDepth();

    this.lastUpdateId = update.lastUpdateId;
    this.timestamp = update.timestamp;

    return { success: true };
  }

  /**
   * 获取当前订单簿快照
   */
  getSnapshot(): OrderBookSnapshot {
    const bids = Array.from(this.bids.entries())
      .map(([price, quantity]) => ({ price, quantity }))
      .sort((a, b) => b.price - a.price)
      .slice(0, 100);

    const asks = Array.from(this.asks.entries())
      .map(([price, quantity]) => ({ price, quantity }))
      .sort((a, b) => a.price - b.price)
      .slice(0, 100);

    return {
      symbol: this.symbol,
      exchange: this.exchange,
      timestamp: this.timestamp,
      bids,
      asks,
      lastUpdateId: this.lastUpdateId,
    };
  }

  /**
   * 计算市价执行滑点
   *
   * 模拟执行市价单，逐档消耗流动性，计算平均执行价格与中间价的偏离
   */
  calculateSlippage(
    side: OrderSide,
    quantity: number,
    depthLevel: number = 10
  ): {
    avgPrice: number;
    slippagePercent: number;
    consumedDepthLevels: number;
  } {
    const orderBook = side === OrderSide.BUY ? this.asks : this.bids;
    const entries = Array.from(orderBook.entries())
      .sort((a, b) => {
        if (side === OrderSide.BUY) {
          return a[0] - b[0]; // asks升序
        } else {
          return b[0] - a[0]; // bids降序
        }
      })
      .slice(0, depthLevel);

    let remainingQty = quantity;
    let totalCost = 0;
    let consumedLevels = 0;

    for (const [price, qty] of entries) {
      const filledQty = Math.min(remainingQty, qty);
      totalCost += filledQty * price;
      remainingQty -= filledQty;
      consumedLevels++;

      if (remainingQty <= 0) break;
    }

    if (remainingQty > 0) {
      // 深度不足以填满订单
      return {
        avgPrice: 0,
        slippagePercent: 999, // 无穷大滑点
        consumedDepthLevels: consumedLevels,
      };
    }

    const avgPrice = totalCost / quantity;
    const midPrice = this.getMidPrice();
    const slippagePercent = ((avgPrice - midPrice) / midPrice) * 100;

    return {
      avgPrice,
      slippagePercent: Math.abs(slippagePercent),
      consumedDepthLevels: consumedLevels,
    };
  }

  /**
   * 获取中间价（bid和ask的平均值）
   */
  getMidPrice(): number {
    const topBid = this.getTopBid();
    const topAsk = this.getTopAsk();

    if (!topBid || !topAsk) {
      return 0;
    }

    return (topBid + topAsk) / 2;
  }

  /**
   * 获取点差（spread）
   */
  getSpread(): number {
    const topBid = this.getTopBid();
    const topAsk = this.getTopAsk();

    if (!topBid || !topAsk) {
      return 0;
    }

    return topAsk - topBid;
  }

  /**
   * 获取前N档的深度（按side）
   */
  getDepth(side: OrderSide, levels: number = 5): PriceLevel[] {
    const book = side === OrderSide.BUY ? this.bids : this.asks;
    const entries = Array.from(book.entries());

    if (side === OrderSide.BUY) {
      // bids降序排列
      entries.sort((a, b) => b[0] - a[0]);
    } else {
      // asks升序排列
      entries.sort((a, b) => a[0] - b[0]);
    }

    return entries
      .slice(0, levels)
      .map(([price, quantity]) => ({ price, quantity }));
  }

  /**
   * 检测订单簿是否失衡
   *
   * 失衡指标：
   * - 单次更新中删除的档位数 > 总档位数的threshold%
   * - spread突变 > 正常spread的倍数
   */
  detectImbalance(previousSnapshot: OrderBookSnapshot, threshold: number = 0.3): {
    imbalanced: boolean;
    reason?: string;
    metrics: {
      bidLevelsRemoved: number;
      askLevelsRemoved: number;
      spreadChange: number;
    };
  } {
    const previousSpread =
      (previousSnapshot.asks[0]?.price || 0) - (previousSnapshot.bids[0]?.price || 0);
    const currentSpread = this.getSpread();

    const currentSnapshot = this.getSnapshot();

    // 计算档位变化
    const previousBidSet = new Set(previousSnapshot.bids.map((l) => l.price));
    const currentBidSet = new Set(currentSnapshot.bids.map((l) => l.price));
    const bidLevelsRemoved = Array.from(previousBidSet).filter((p) => !currentBidSet.has(p))
      .length;

    const previousAskSet = new Set(previousSnapshot.asks.map((l) => l.price));
    const currentAskSet = new Set(currentSnapshot.asks.map((l) => l.price));
    const askLevelsRemoved = Array.from(previousAskSet).filter((p) => !currentAskSet.has(p))
      .length;

    const totalLevels = previousSnapshot.bids.length + previousSnapshot.asks.length;
    const removedRatio = (bidLevelsRemoved + askLevelsRemoved) / totalLevels;

    const spreadChange = Math.abs(currentSpread - previousSpread) / (previousSpread || 1);

    const imbalanced = removedRatio > threshold || spreadChange > 5;

    return {
      imbalanced,
      reason: imbalanced
        ? `Removed ${removedRatio.toFixed(2)}% levels, spread change ${spreadChange.toFixed(2)}x`
        : undefined,
      metrics: {
        bidLevelsRemoved,
        askLevelsRemoved,
        spreadChange,
      },
    };
  }

  /**
   * 获取最优买价
   */
  private getTopBid(): number | null {
    const topBid = Math.max(...Array.from(this.bids.keys()));
    return Number.isFinite(topBid) ? topBid : null;
  }

  /**
   * 获取最优卖价
   */
  private getTopAsk(): number | null {
    const topAsk = Math.min(...Array.from(this.asks.keys()));
    return Number.isFinite(topAsk) ? topAsk : null;
  }

  /**
   * 防守设计：删除极端价格的订单簿数据
   * 防止内存泄漏和垃圾数据
   */
  private pruneExtremeDepth(): void {
    if (this.bids.size > this.maxDepthSize) {
      const sortedBids = Array.from(this.bids.keys()).sort((a, b) => b - a);
      const toRemove = sortedBids.slice(this.maxDepthSize);
      toRemove.forEach((price) => this.bids.delete(price));
    }

    if (this.asks.size > this.maxDepthSize) {
      const sortedAsks = Array.from(this.asks.keys()).sort((a, b) => a - b);
      const toRemove = sortedAsks.slice(this.maxDepthSize);
      toRemove.forEach((price) => this.asks.delete(price));
    }
  }

  /**
   * 状态检查：验证订单簿数据的一致性
   */
  isValid(): boolean {
    // 检查bid和ask不重叠
    const maxBid = Math.max(...Array.from(this.bids.keys()));
    const minAsk = Math.min(...Array.from(this.asks.keys()));

    if (Number.isFinite(maxBid) && Number.isFinite(minAsk)) {
      return maxBid < minAsk;
    }

    return true;
  }
}
