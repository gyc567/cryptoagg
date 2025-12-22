/**
 * Binance 集成 - 使用指南和测试脚本
 *
 * 这个文件展示了如何：
 * 1. 配置Binance API
 * 2. 初始化市场数据管理器
 * 3. 订阅告警
 * 4. 监控健康状态
 * 5. 优雅关闭
 */

import { createMarketDataManager } from '@/server/manager';
import { BinanceWSClientTests } from '@/server/__tests__/binance.test';
import { MarketDataIntegrationTests } from '@/server/__tests__/integration.test';

/**
 * 示例：使用Binance实时数据
 */
export async function exampleRealtime(): Promise<void> {
  console.log('=== Binance Real-time Example ===\n');

  // 从环境变量创建管理器
  const manager = createMarketDataManager();

  // 订阅告警
  const unsubscribe = manager.onAlert((alert) => {
    console.log(`
🚨 Alert: ${alert.symbol}
   Type: ${alert.detectionType}
   Severity: ${alert.severity}/10
   Confidence: ${(alert.confidence * 100).toFixed(0)}%
   ${alert.metrics.tradeQty ? `Trade qty: ${alert.metrics.tradeQty}` : ''}
   ${alert.metrics.slippagePercent ? `Slippage: ${alert.metrics.slippagePercent.toFixed(2)}%` : ''}
    `);
  });

  // 初始化并连接
  try {
    console.log('Initializing...');
    await manager.initialize();
    console.log('✅ Connected to Binance\n');

    // 定期检查健康状态
    const healthCheckInterval = setInterval(() => {
      const health = manager.healthCheck();
      const stats = manager.getStats();

      console.log(`\n📊 Status: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
      Object.entries(stats).forEach(([symbol, stat]) => {
        console.log(
          `  ${symbol}: ${stat.totalDepthUpdates} depth updates, ${stat.totalAlerts} alerts`
        );
      });
    }, 30000); // 每30秒输出一次

    // 运行10分钟后关闭
    setTimeout(() => {
      clearInterval(healthCheckInterval);
      console.log('\n\nShutting down...');
      manager.shutdown();
      unsubscribe();
      console.log('✅ Shutdown complete');
      process.exit(0);
    }, 10 * 60 * 1000);
  } catch (error) {
    console.error('Failed to initialize:', error);
    process.exit(1);
  }
}

/**
 * 示例：运行所有测试
 */
export async function runAllTests(): Promise<void> {
  console.log('🧪 Running all tests...\n');

  // 运行单元测试
  BinanceWSClientTests.runAll();

  // 等待一下
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 运行集成测试
  await MarketDataIntegrationTests.runAll();
}

/**
 * 示例：测试模式（不需要实际API key）
 */
export async function exampleTestMode(): Promise<void> {
  console.log('=== Test Mode Example ===\n');

  const manager = createMarketDataManager();

  // 覆盖为测试模式
  const testManager = new (require('@/server/manager').MarketDataManager)({
    binance: {
      enabled: true,
      symbols: ['BTC/USDT', 'ETH/USDT'],
      isTestMode: true,
    },
  });

  let alertCount = 0;

  testManager.onAlert((alert) => {
    alertCount++;
    console.log(`Alert #${alertCount}: ${alert.symbol} (${alert.detectionType})`);
  });

  await testManager.initialize();

  // 模拟100个数据事件
  for (let i = 0; i < 100; i++) {
    const processor = testManager.getProcessor('BTC/USDT');
    if (processor) {
      processor.processTrade({
        symbol: 'BTC/USDT',
        exchange: 'BINANCE',
        timestamp: Date.now(),
        tradeId: `trade_${i}`,
        price: 50000 + Math.random() * 1000,
        quantity: Math.random() * 200,
        side: Math.random() > 0.5 ? 'BUY' : 'SELL',
        isBuyerMaker: Math.random() > 0.5,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  console.log(`\n✅ Generated ${alertCount} alerts in test mode`);

  testManager.shutdown();
}

/**
 * 环境变量检查
 */
function checkEnvironment(): boolean {
  const required = ['BINANCE_API_KEY', 'BINANCE_SECRET_KEY'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.log('⚠️  Missing environment variables:');
    missing.forEach((key) => {
      console.log(`   ${key} - set in .env file`);
    });
    return false;
  }

  return true;
}

/**
 * 主入口
 */
async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case 'test':
      await runAllTests();
      break;

    case 'test-mode':
      await exampleTestMode();
      break;

    case 'realtime':
      if (!checkEnvironment()) {
        process.exit(1);
      }
      await exampleRealtime();
      break;

    default:
      console.log(`
Usage:
  npm run test:market                 # Run all tests
  npm run test:market -- test-mode    # Run in test mode (no API key needed)
  npm run test:market -- realtime     # Connect to real Binance (requires .env)

Examples:
  # Test everything
  npm run test:market

  # Quick test without API key
  npm run test:market -- test-mode

  # Live monitoring (requires .env with BINANCE_API_KEY and BINANCE_SECRET_KEY)
  npm run test:market -- realtime
      `);
  }
}

// 仅在直接执行时运行
if (require.main === module) {
  main().catch(console.error);
}
