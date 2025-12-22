/**
 * 默认配置
 *
 * 包含各主流币对的检测阈值和全局参数
 */

import { DetectionConfig, Exchange, PairThreshold } from './types';

/**
 * 币对特定的检测阈值
 *
 * 根据币对的流动性和成交量设定不同的阈值
 */
const createPairThreshold = (
  largeTradeQty: number,
  minSlippage: number = 1.5,
  imbalanceRatio: number = 0.3
): PairThreshold => ({
  largeTradeQtyThreshold: largeTradeQty,
  minSlippagePercent: minSlippage,
  orderBookImbalanceRatio: imbalanceRatio,
  dailyVolumeCheckEnabled: true,
});

export const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  exchanges: {
    BINANCE: {
      enabled: true,
      wsUrl: 'wss://stream.binance.com:9443/ws',
      restUrl: 'https://api.binance.com/api/v3',
      rateLimit: 10,
    },
    OKX: {
      enabled: true,
      wsUrl: 'wss://ws.okx.com:8443/ws/v5/public',
      restUrl: 'https://www.okx.com/api/v5',
      rateLimit: 10,
    },
    BYBIT: {
      enabled: true,
      wsUrl: 'wss://stream.bybit.com/v5/public/linear',
      restUrl: 'https://api.bybit.com/v5',
      rateLimit: 10,
    },
    COINBASE: {
      enabled: false,
      wsUrl: 'wss://advanced-trade-ws.coinbase.com',
      restUrl: 'https://api.coinbase.com',
      rateLimit: 5,
    },
    KRAKEN: {
      enabled: false,
      wsUrl: 'wss://ws.kraken.com',
      restUrl: 'https://api.kraken.com',
      rateLimit: 15,
    },
  },

  pairThresholds: {
    // 主流币对：BTC, ETH
    'BTC/USDT': createPairThreshold(50, 1.5, 0.3), // 50枚BTC = 大额
    'BTC/BUSD': createPairThreshold(50, 1.5, 0.3),
    'BTC/USD': createPairThreshold(50, 1.5, 0.3),

    'ETH/USDT': createPairThreshold(500, 1.5, 0.3), // 500枚ETH = 大额
    'ETH/BUSD': createPairThreshold(500, 1.5, 0.3),
    'ETH/USD': createPairThreshold(500, 1.5, 0.3),

    // 二线币对
    'SOL/USDT': createPairThreshold(10000, 1.8, 0.25),
    'XRP/USDT': createPairThreshold(100000, 2.0, 0.25),
    'ADA/USDT': createPairThreshold(100000, 2.0, 0.25),
    'DOGE/USDT': createPairThreshold(500000, 2.0, 0.25),

    // 默认阈值（如果没有特殊配置）
    '__DEFAULT__': createPairThreshold(10000, 2.0, 0.3),
  },

  global: {
    // 检测深度档位：检查消耗前5档、10档、20档的滑点
    detectionDepthLevels: [5, 10, 20],

    // 乱序缓冲窗口：200ms内的乱序消息会被缓冲
    bufferWindowMs: 200,

    // 告警聚合窗口：1秒内同币对的相同告警会被合并
    alertAggregationWindowMs: 1000,
  },
};

/**
 * 获取币对的检测阈值
 *
 * 如果币对没有配置，返回默认值
 */
export function getPairThreshold(symbol: string): PairThreshold {
  return (
    DEFAULT_DETECTION_CONFIG.pairThresholds[symbol] ||
    DEFAULT_DETECTION_CONFIG.pairThresholds['__DEFAULT__']
  );
}

/**
 * 获取交易所配置
 */
export function getExchangeConfig(exchange: Exchange) {
  const config = DEFAULT_DETECTION_CONFIG.exchanges[exchange];
  if (!config) {
    throw new Error(`Unknown exchange: ${exchange}`);
  }
  return config;
}
