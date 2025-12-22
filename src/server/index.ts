/**
 * 市价吃单监控系统 - 公共导出
 *
 * 导出所有核心类型和工具函数
 */

// 类型定义
export * from './types';

// 配置
export { DEFAULT_DETECTION_CONFIG, getPairThreshold, getExchangeConfig } from './config';

// 核心处理器
export { OrderBook } from './orderbook';
export { MarketTakerDetector } from './detector';
export {
  MarketDataProcessor,
  MarketDataProcessorPool,
  type MarketDataProcessorConfig,
} from './processor';

// Binance 集成
export { BinanceWSClient, type BinanceWSConfig } from './binance';
export {
  MarketDataManager,
  createMarketDataManager,
  type MarketDataSourceConfig,
} from './manager';

// 前端钩子（仅在浏览器中可用）
export { useMarketDataMonitor } from '@/hooks/useMarketDataMonitor';
