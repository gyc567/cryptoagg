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
  private volumeUpdateTimer: NodeJS.Timeout | null = null;
  private validatorTimer: NodeJS.Timeout | null = null;

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
      // 初始使用估计值，避免阻塞启动
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

    // 启动动态成交量更新
    this.startVolumeUpdater(binanceConfig.symbols);
    
    // 启动数据校验
    this.startValidator(binanceConfig.symbols);
  }

  /**
   * 启动成交量动态更新任务
   */
  private startVolumeUpdater(symbols: string[]): void {
    const updateVolumes = async () => {
      if (!this.binanceClient) return;
      
      console.log('[Market] Updating 24h volumes...');
      
      for (const symbol of symbols) {
        const binanceSymbol = symbol.replace('/', '');
        const volume = await this.binanceClient.get24hTicker(binanceSymbol);
        
        if (volume > 0) {
          const processor = this.pool.getProcessor(symbol);
          if (processor) {
            processor.updateDailyVolume(volume);
            // console.log(`[Market] Updated volume for ${symbol}: ${volume}`);
          }
        }
      }
    };

    // 立即执行一次
    updateVolumes();

    // 每1小时更新一次
    this.volumeUpdateTimer = setInterval(updateVolumes, 60 * 60 * 1000);
  }

  /**
   * 启动数据一致性校验任务
   */
  private startValidator(symbols: string[]): void {
    const validate = async () => {
      if (!this.binanceClient) return;

      for (const symbol of symbols) {
        const binanceSymbol = symbol.replace('/', '');
        const snapshot = await this.binanceClient.getDepthSnapshot(binanceSymbol);
        
        if (snapshot) {
          const processor = this.pool.getProcessor(symbol);
          if (processor) {
            const isValid = processor.validateAgainstSnapshot(snapshot);
            if (!isValid) {
              // 校验失败，重新初始化该币对（简化处理：仅打印日志，实际可重连）
              console.warn(`[Market] Validation failed for ${symbol}. Consistency check failed.`);
            }
          }
        }
      }
    };

    // 每60秒校验一次
    this.validatorTimer = setInterval(validate, 60 * 1000);
  }

  /**
   * 获取币对的估计日均成交量
   *
   * 仅作为启动时的Fallabck
   */
  private getEstimatedDailyVolume(symbol: string): number {
    const volumes: Record<string, number> = {
      'BTC/USDT': 100000000, // 1亿
      'ETH/USDT': 50000000,
      'SOL/USDT': 20000000,
      'XRP/USDT': 10000000,
    };

    return volumes[symbol] || 10000000; // 默认1000万
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
    if (this.volumeUpdateTimer) {
      clearInterval(this.volumeUpdateTimer);
      this.volumeUpdateTimer = null;
    }

    if (this.validatorTimer) {
      clearInterval(this.validatorTimer);
      this.validatorTimer = null;
    }
    
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
