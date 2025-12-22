/**
 * 市场数据源适配器（Adapter Pattern）
 *
 * 职责：
 * - 连接具体的数据源（Binance、OKX等）到通用处理器
 * - 低耦合：数据源改变，处理器无需改动
 * - 可扩展：容易添加新的交易所
 *
 * 设计模式：Adapter + Factory
 */

import { MarketDataProcessor, MarketDataProcessorPool } from './processor';
import { BinanceWSClient, BinanceWSConfig } from './binance';
import { getPairThreshold } from './config';
import { Exchange } from './types';

/**
 * 市场数据源配置
 */
export interface MarketDataSourceConfig {
  // Binance配置
  binance?: {
    enabled: boolean;
    apiKey?: string;
    secretKey?: string;
    symbols: string[];
    isTestMode?: boolean;
  };
  // 未来：OKX、Bybit等
}

/**
 * 市场数据管理器
 *
 * 职责：
 * 1. 管理多个数据源（交易所）
 * 2. 为每个币对创建处理器
 * 3. 连接数据源和处理器
 * 4. 提供统一的监听接口
 */
export class MarketDataManager {
  private pool: MarketDataProcessorPool = new MarketDataProcessorPool();
  private binanceClient: BinanceWSClient | null = null;
  private config: MarketDataSourceConfig;

  constructor(config: MarketDataSourceConfig) {
    this.config = config;
  }

  /**
   * 初始化并连接所有数据源
   */
  async initialize(): Promise<void> {
    try {
      if (this.config.binance?.enabled) {
        await this.initializeBinance();
      }

      console.log('[Market] All data sources initialized');
    } catch (error) {
      console.error('[Market] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 初始化Binance数据源
   */
  private async initializeBinance(): Promise<void> {
    const binanceConfig = this.config.binance!;

    // 转换币对格式（/USDT -> USDT）
    const binanceSymbols = binanceConfig.symbols.map((s) => s.replace('/', '').toUpperCase());

    this.binanceClient = new BinanceWSClient({
      apiKey: binanceConfig.apiKey,
      secretKey: binanceConfig.secretKey,
      symbols: binanceSymbols,
      isTestMode: binanceConfig.isTestMode,
    });

    // 为每个币对创建处理器
    for (const symbol of binanceConfig.symbols) {
      const processor = this.pool.addProcessor(symbol, {
        symbol,
        exchange: Exchange.BINANCE,
        pairThreshold: getPairThreshold(symbol),
        dailyVolume: this.getEstimatedDailyVolume(symbol),
      });

      // 连接Binance数据源到处理器
      const binanceSymbol = symbol.replace('/', '');

      this.binanceClient!.subscribeToDepth(binanceSymbol, (depthUpdate) => {
        processor.processDepthUpdate(depthUpdate);
      });

      this.binanceClient!.subscribeToTrade(binanceSymbol, (trade) => {
        processor.processTrade(trade);
      });
    }

    // 连接到Binance WebSocket
    await this.binanceClient.connect();

    console.log('[Binance] Connected and monitoring', binanceConfig.symbols);
  }

  /**
   * 获取币对的估计日均成交量
   *
   * 实际应该从REST API动态获取，这里用静态值
   */
  private getEstimatedDailyVolume(symbol: string): number {
    const volumes: Record<string, number> = {
      'BTC/USDT': 100000,
      'ETH/USDT': 500000,
      'SOL/USDT': 2000000,
      'XRP/USDT': 5000000,
    };

    return volumes[symbol] || 1000000; // 默认100万
  }

  /**
   * 订阅所有告警
   */
  onAlert(listener: (alert: any) => void): () => void {
    return this.pool.onAlert(listener);
  }

  /**
   * 获取特定币对的处理器
   */
  getProcessor(symbol: string) {
    return this.pool.getProcessor(symbol);
  }

  /**
   * 获取所有处理器的统计信息
   */
  getStats() {
    return this.pool.getAllStats();
  }

  /**
   * 健康检查
   */
  healthCheck() {
    const poolHealth = this.pool.healthCheck();

    return {
      ...poolHealth,
      binance: {
        connected: this.binanceClient?.isConnected() ?? false,
      },
    };
  }

  /**
   * 关闭所有数据源
   */
  shutdown(): void {
    if (this.binanceClient) {
      this.binanceClient.disconnect();
    }
  }
}

/**
 * 工厂函数：从环境变量创建管理器
 */
export function createMarketDataManager(): MarketDataManager {
  const isBinanceEnabled = process.env.MARKET_DATA_ENABLED !== 'false';
  const symbols = (process.env.MARKET_DATA_SYMBOLS || 'BTC/USDT,ETH/USDT').split(',');
  const isTestMode = process.env.NODE_ENV === 'test';

  return new MarketDataManager({
    binance: {
      enabled: isBinanceEnabled,
      apiKey: process.env.BINANCE_API_KEY,
      secretKey: process.env.BINANCE_SECRET_KEY,
      symbols: symbols.map((s) => s.trim()),
      isTestMode,
    },
  });
}
