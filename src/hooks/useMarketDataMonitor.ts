/**
 * 市场数据监控React Hook
 *
 * 用于前端集成，提供实时的吃单告警数据
 *
 * 使用示例：
 * ```
 * const { alerts, isLoading } = useMarketDataMonitor(['BTC/USDT', 'ETH/USDT']);
 * ```
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { MarketTakerAlert, Trade, DepthUpdate } from '@/server/types';
import { MarketDataProcessorPool, MarketDataProcessorConfig } from '@/server/processor';
import { getPairThreshold } from '@/server/config';
import { Exchange } from '@/server/types';

export interface UseMarketDataMonitorOptions {
  symbols?: string[];
  exchanges?: Exchange[];
  maxAlerts?: number;
  pollInterval?: number; // 用于模拟的轮询间隔（ms）
}

export function useMarketDataMonitor(options: UseMarketDataMonitorOptions = {}) {
  const {
    symbols = ['BTC/USDT', 'ETH/USDT'],
    exchanges = [Exchange.BINANCE, Exchange.OKX],
    maxAlerts = 50,
    pollInterval = 100,
  } = options;

  const [alerts, setAlerts] = useState<MarketTakerAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 保持处理器池的引用，以便在卸载时清理
  const processorPoolRef = useRef<MarketDataProcessorPool | null>(null);
  const unsubscribersRef = useRef<Array<() => void>>([]);
  const simulationRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化处理器
  useEffect(() => {
    try {
      const pool = new MarketDataProcessorPool();

      // 为每个币对初始化处理器
      for (const symbol of symbols) {
        const config: MarketDataProcessorConfig = {
          symbol,
          exchange: exchanges[0], // 简化：只用第一个交易所
          pairThreshold: getPairThreshold(symbol),
          dailyVolume: symbol.includes('BTC') ? 100000 : 500000, // 模拟日均成交量
        };

        const processor = pool.addProcessor(symbol, config);

        // 初始化订单簿（模拟数据）
        processor.initializeOrderBook({
          symbol,
          exchange: config.exchange,
          timestamp: Date.now(),
          bids: generateMockBids(symbol),
          asks: generateMockAsks(symbol),
          lastUpdateId: Math.floor(Math.random() * 1000000),
        });
      }

      // 订阅所有告警
      const unsubscribe = pool.onAlert((alert) => {
        setAlerts((prev) => {
          const newAlerts = [alert, ...prev].slice(0, maxAlerts);
          return newAlerts;
        });
      });

      processorPoolRef.current = pool;
      unsubscribersRef.current.push(unsubscribe);

      // 模拟WebSocket数据流
      const simulateMarketData = () => {
        for (const symbol of symbols) {
          const processor = pool.getProcessor(symbol);
          if (processor) {
            // 随机生成成交数据
            if (Math.random() > 0.7) {
              const trade = generateMockTrade(symbol, exchanges[0]);
              processor.processTrade(trade);
            }

            // 随机生成深度更新
            if (Math.random() > 0.6) {
              const depthUpdate = generateMockDepthUpdate(symbol, exchanges[0]);
              processor.processDepthUpdate(depthUpdate);
            }
          }
        }
      };

      simulationRef.current = setInterval(simulateMarketData, pollInterval);

      setIsLoading(false);

      return () => {
        // 清理
        if (simulationRef.current) {
          clearInterval(simulationRef.current);
        }
        unsubscribersRef.current.forEach((unsub) => unsub());
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsLoading(false);
    }
  }, [symbols, exchanges, maxAlerts, pollInterval]);

  // 清除陈旧的告警
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // 获取特定币对的告警
  const getAlertsBySymbol = useCallback(
    (symbol: string) => {
      return alerts.filter((alert) => alert.symbol === symbol);
    },
    [alerts]
  );

  return {
    alerts,
    isLoading,
    error,
    clearAlerts,
    getAlertsBySymbol,
    alertCount: alerts.length,
  };
}

// ============================================================================
// 模拟数据生成函数
// ============================================================================

/**
 * 生成模拟的买单簿
 */
function generateMockBids(symbol: string) {
  const basePrice = getBasePrice(symbol);
  const bids = [];

  for (let i = 0; i < 20; i++) {
    const price = basePrice - (i * basePrice) / 500;
    const quantity = (Math.random() * 100 + 10) * (symbol.includes('BTC') ? 1 : 10);
    bids.push({ price, quantity });
  }

  return bids;
}

/**
 * 生成模拟的卖单簿
 */
function generateMockAsks(symbol: string) {
  const basePrice = getBasePrice(symbol);
  const asks = [];

  for (let i = 0; i < 20; i++) {
    const price = basePrice + (i * basePrice) / 500;
    const quantity = (Math.random() * 100 + 10) * (symbol.includes('BTC') ? 1 : 10);
    asks.push({ price, quantity });
  }

  return asks;
}

/**
 * 生成模拟的成交数据
 */
function generateMockTrade(symbol: string, exchange: Exchange): Trade {
  const basePrice = getBasePrice(symbol);
  const price = basePrice * (0.99 + Math.random() * 0.02); // ±1%波动
  const side = Math.random() > 0.5 ? 'BUY' : 'SELL';

  // 10%概率生成大额成交
  let quantity = Math.random() * 10 + 1;
  if (Math.random() < 0.1) {
    quantity *= 50; // 放大成交量，触发告警
  }

  return {
    symbol,
    exchange,
    timestamp: Date.now(),
    tradeId: `trade_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    price,
    quantity,
    side: side as 'BUY' | 'SELL',
    isBuyerMaker: Math.random() > 0.5,
  };
}

/**
 * 生成模拟的深度更新
 */
function generateMockDepthUpdate(symbol: string, exchange: Exchange): DepthUpdate {
  const now = Date.now();
  const updateId = Math.floor(Math.random() * 1000000);

  // 10%概率生成失衡的订单簿（大量档位消失）
  let bids: [string, string][] = [];
  let asks: [string, string][] = [];

  if (Math.random() < 0.1) {
    // 失衡情况：档位大幅减少
    for (let i = 0; i < 5; i++) {
      bids.push([String(getBasePrice(symbol) - i * 100), '0']); // 删除档位
      asks.push([String(getBasePrice(symbol) + i * 100), '0']);
    }
  } else {
    // 正常更新
    for (let i = 0; i < 5; i++) {
      bids.push([
        String(getBasePrice(symbol) - i * 100),
        String(Math.random() * 100 + 10),
      ]);
      asks.push([
        String(getBasePrice(symbol) + i * 100),
        String(Math.random() * 100 + 10),
      ]);
    }
  }

  return {
    symbol,
    exchange,
    timestamp: now,
    eventTime: now,
    firstUpdateId: updateId,
    lastUpdateId: updateId + 1,
    bids,
    asks,
  };
}

/**
 * 获取币对的基础价格
 */
function getBasePrice(symbol: string): number {
  if (symbol.includes('BTC')) return 98000;
  if (symbol.includes('ETH')) return 3500;
  if (symbol.includes('SOL')) return 250;
  if (symbol.includes('XRP')) return 3;
  return 100;
}
