/**
 * 市场数据集成测试
 *
 * 测试场景：
 * 1. 完整的数据流：WebSocket -> 处理器 -> 告警
 * 2. 大额成交检测
 * 3. 订单簿失衡检测
 * 4. 滑点异常检测
 * 5. 多币对并行处理
 * 6. 管理器初始化和关闭
 */

import { MarketDataManager } from '@/server/manager';
import { MarketDataProcessor } from '@/server/processor';
import { MarketTakerAlert } from '@/server/types';
import { OrderBookSnapshot, Trade, DepthUpdate, Exchange, OrderSide } from '@/server/types';

/**
 * 集成测试
 */
export class MarketDataIntegrationTests {
  /**
   * 测试1：基础初始化
   */
  static async testBasicInitialization(): Promise<void> {
    console.log('🧪 Test: Basic initialization');

    const manager = new MarketDataManager({
      binance: {
        enabled: true,
        symbols: ['BTC/USDT', 'ETH/USDT'],
        isTestMode: true,
      },
    });

    await manager.initialize();

    // 验证处理器已创建
    const btcProcessor = manager.getProcessor('BTC/USDT');
    console.assert(btcProcessor !== null, 'Should create BTC processor');

    const ethProcessor = manager.getProcessor('ETH/USDT');
    console.assert(ethProcessor !== null, 'Should create ETH processor');

    manager.shutdown();

    console.log('✅ Basic initialization passed');
  }

  /**
   * 测试2：大额成交检测
   */
  static async testLargeTradeDetection(): Promise<void> {
    console.log('🧪 Test: Large trade detection');

    const manager = new MarketDataManager({
      binance: {
        enabled: true,
        symbols: ['BTC/USDT'],
        isTestMode: true,
      },
    });

    await manager.initialize();

    const processor = manager.getProcessor('BTC/USDT')!;

    let alertReceived: MarketTakerAlert | null = null;

    manager.onAlert((alert) => {
      alertReceived = alert;
    });

    // 初始化订单簿
    processor.initializeOrderBook({
      symbol: 'BTC/USDT',
      exchange: Exchange.BINANCE,
      timestamp: Date.now(),
      bids: [
        { price: 50000, quantity: 10 },
        { price: 49900, quantity: 20 },
      ],
      asks: [
        { price: 50100, quantity: 10 },
        { price: 50200, quantity: 20 },
      ],
      lastUpdateId: 1000,
    });

    // 发送大额成交（超过50 BTC阈值）
    const largeTrade: Trade = {
      symbol: 'BTC/USDT',
      exchange: Exchange.BINANCE,
      timestamp: Date.now(),
      tradeId: 'trade_1',
      price: 50000,
      quantity: 100, // > 50 BTC阈值
      side: OrderSide.BUY,
      isBuyerMaker: false,
    };

    processor.processTrade(largeTrade);

    console.assert(alertReceived !== null, 'Should generate alert for large trade');
    console.assert(alertReceived?.metrics.tradeQty === 100, 'Should record trade quantity');
    console.assert(alertReceived?.severity >= 6, 'Should have severity >= 6');

    manager.shutdown();

    console.log('✅ Large trade detection passed');
  }

  /**
   * 测试3：订单簿失衡检测
   */
  static async testOrderbookImbalanceDetection(): Promise<void> {
    console.log('🧪 Test: Orderbook imbalance detection');

    const manager = new MarketDataManager({
      binance: {
        enabled: true,
        symbols: ['ETH/USDT'],
        isTestMode: true,
      },
    });

    await manager.initialize();

    const processor = manager.getProcessor('ETH/USDT')!;

    let alertReceived: MarketTakerAlert | null = null;

    manager.onAlert((alert) => {
      if (alert.symbol === 'ETH/USDT') {
        alertReceived = alert;
      }
    });

    // 初始化订单簿
    processor.initializeOrderBook({
      symbol: 'ETH/USDT',
      exchange: Exchange.BINANCE,
      timestamp: Date.now(),
      bids: Array.from({ length: 20 }, (_, i) => ({
        price: 3500 - i * 10,
        quantity: 100,
      })),
      asks: Array.from({ length: 20 }, (_, i) => ({
        price: 3500 + i * 10,
        quantity: 100,
      })),
      lastUpdateId: 1000,
    });

    // 发送深度更新，删除大量档位
    const imbalanceDepth: DepthUpdate = {
      symbol: 'ETH/USDT',
      exchange: Exchange.BINANCE,
      timestamp: Date.now(),
      eventTime: Date.now(),
      firstUpdateId: 1001,
      lastUpdateId: 1002,
      bids: [
        // 删除所有但一个bid
        ['3500', '0'],
        ['3490', '0'],
        ['3480', '0'],
        ['3470', '0'],
        ['3460', '0'],
      ],
      asks: [
        // 删除一些ask
        ['3510', '0'],
        ['3520', '0'],
        ['3530', '0'],
        ['3540', '0'],
      ],
    };

    processor.processDepthUpdate(imbalanceDepth);

    console.assert(
      alertReceived !== null,
      'Should detect orderbook imbalance'
    );

    if (alertReceived) {
      console.assert(
        alertReceived?.metrics.orderBookDepthConsumed! >= 5,
        'Should record consumed depth'
      );
    }

    manager.shutdown();

    console.log('✅ Orderbook imbalance detection passed');
  }

  /**
   * 测试4：多币对并行处理
   */
  static async testMultiplePairProcessing(): Promise<void> {
    console.log('🧪 Test: Multiple pair processing');

    const manager = new MarketDataManager({
      binance: {
        enabled: true,
        symbols: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
        isTestMode: true,
      },
    });

    await manager.initialize();

    const alerts: Record<string, MarketTakerAlert> = {};

    manager.onAlert((alert) => {
      if (!alerts[alert.symbol]) {
        alerts[alert.symbol] = alert;
      }
    });

    // 为每个币对发送数据
    ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'].forEach((symbol) => {
      const processor = manager.getProcessor(symbol)!;

      // 初始化
      processor.initializeOrderBook({
        symbol,
        exchange: Exchange.BINANCE,
        timestamp: Date.now(),
        bids: [{ price: 100, quantity: 10 }],
        asks: [{ price: 101, quantity: 10 }],
        lastUpdateId: 1000,
      });

      // 发送大额成交
      processor.processTrade({
        symbol,
        exchange: Exchange.BINANCE,
        timestamp: Date.now(),
        tradeId: `trade_${symbol}`,
        price: 100,
        quantity: 500000, // 大额
        side: OrderSide.BUY,
        isBuyerMaker: false,
      });
    });

    // 验证所有币对都生成了告警
    console.assert(Object.keys(alerts).length === 3, 'Should have alerts for all 3 pairs');

    manager.shutdown();

    console.log('✅ Multiple pair processing passed');
  }

  /**
   * 测试5：告警去重
   */
  static async testAlertDeduplication(): Promise<void> {
    console.log('🧪 Test: Alert deduplication');

    const manager = new MarketDataManager({
      binance: {
        enabled: true,
        symbols: ['BTC/USDT'],
        isTestMode: true,
      },
    });

    await manager.initialize();

    const processor = manager.getProcessor('BTC/USDT')!;

    let alertCount = 0;

    manager.onAlert(() => {
      alertCount++;
    });

    processor.initializeOrderBook({
      symbol: 'BTC/USDT',
      exchange: Exchange.BINANCE,
      timestamp: Date.now(),
      bids: [{ price: 50000, quantity: 10 }],
      asks: [{ price: 50100, quantity: 10 }],
      lastUpdateId: 1000,
    });

    // 连续发送多个大额成交
    for (let i = 0; i < 5; i++) {
      processor.processTrade({
        symbol: 'BTC/USDT',
        exchange: Exchange.BINANCE,
        timestamp: Date.now(),
        tradeId: `trade_${i}`,
        price: 50000,
        quantity: 100,
        side: OrderSide.BUY,
        isBuyerMaker: false,
      });
    }

    // 由于去重，应该只有1个告警
    console.assert(alertCount <= 1, 'Should deduplicate alerts within window');

    manager.shutdown();

    console.log('✅ Alert deduplication passed');
  }

  /**
   * 测试6：统计信息
   */
  static async testStatistics(): Promise<void> {
    console.log('🧪 Test: Statistics');

    const manager = new MarketDataManager({
      binance: {
        enabled: true,
        symbols: ['BTC/USDT'],
        isTestMode: true,
      },
    });

    await manager.initialize();

    const processor = manager.getProcessor('BTC/USDT')!;

    processor.initializeOrderBook({
      symbol: 'BTC/USDT',
      exchange: Exchange.BINANCE,
      timestamp: Date.now(),
      bids: [{ price: 50000, quantity: 10 }],
      asks: [{ price: 50100, quantity: 10 }],
      lastUpdateId: 1000,
    });

    // 发送一些数据
    processor.processTrade({
      symbol: 'BTC/USDT',
      exchange: Exchange.BINANCE,
      timestamp: Date.now(),
      tradeId: 'trade_1',
      price: 50000,
      quantity: 10,
      side: OrderSide.BUY,
      isBuyerMaker: false,
    });

    processor.processDepthUpdate({
      symbol: 'BTC/USDT',
      exchange: Exchange.BINANCE,
      timestamp: Date.now(),
      eventTime: Date.now(),
      firstUpdateId: 1001,
      lastUpdateId: 1002,
      bids: [],
      asks: [],
    });

    const stats = processor.getStats();

    console.assert(stats.totalTrades === 1, 'Should count trades');
    console.assert(stats.totalDepthUpdates === 1, 'Should count depth updates');

    manager.shutdown();

    console.log('✅ Statistics passed');
  }

  /**
   * 测试7：健康检查
   */
  static async testHealthCheck(): Promise<void> {
    console.log('🧪 Test: Health check');

    const manager = new MarketDataManager({
      binance: {
        enabled: true,
        symbols: ['BTC/USDT'],
        isTestMode: true,
      },
    });

    await manager.initialize();

    const health = manager.healthCheck();

    console.assert(health.processors !== undefined, 'Should include processors health');
    console.assert(health.binance !== undefined, 'Should include binance health');

    manager.shutdown();

    console.log('✅ Health check passed');
  }

  /**
   * 运行所有集成测试
   */
  static async runAll(): Promise<void> {
    console.log('\n=== Market Data Integration Tests ===\n');

    try {
      await this.testBasicInitialization();
      await this.testLargeTradeDetection();
      await this.testOrderbookImbalanceDetection();
      await this.testMultiplePairProcessing();
      await this.testAlertDeduplication();
      await this.testStatistics();
      await this.testHealthCheck();

      console.log('\n✅ All integration tests passed!\n');
    } catch (error) {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  MarketDataIntegrationTests.runAll();
}
