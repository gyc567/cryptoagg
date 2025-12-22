/**
 * Binance 实时数据测试脚本
 *
 * 直接连接Binance WebSocket，验证完整的数据流：
 * 1. WebSocket连接
 * 2. 初始深度快照获取
 * 3. 实时数据处理
 * 4. 告警生成
 * 5. 性能监控
 */

import dotenv from 'dotenv';
import { createMarketDataManager } from '@/server/manager';
import { MarketTakerAlert } from '@/server/types';

// 加载环境变量
dotenv.config();

/**
 * 实时数据验证测试
 */
async function runRealtimeTest(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 Binance 实时数据验证测试');
  console.log('='.repeat(70) + '\n');

  // 检查环境变量
  const requiredVars = ['BINANCE_API_KEY', 'BINANCE_SECRET_KEY', 'MARKET_DATA_SYMBOLS'];
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ 缺少环境变量：', missing.join(', '));
    console.error('   请检查 .env 文件配置');
    process.exit(1);
  }

  console.log('✅ 环境变量检查通过');
  console.log(`   API Key: ${process.env.BINANCE_API_KEY!.substring(0, 10)}...`);
  console.log(`   监控币对: ${process.env.MARKET_DATA_SYMBOLS}`);
  console.log('');

  // 初始化管理器
  const manager = createMarketDataManager();

  // 统计数据
  const stats = {
    totalAlerts: 0,
    alertsByType: {} as Record<string, number>,
    alertsBySeverity: {} as Record<number, number>,
    maxSeverity: 0,
    startTime: Date.now(),
    depthUpdates: 0,
    trades: 0,
  };

  // 订阅告警
  const unsubscribe = manager.onAlert((alert: MarketTakerAlert) => {
    stats.totalAlerts++;
    stats.alertsByType[alert.detectionType] = (stats.alertsByType[alert.detectionType] || 0) + 1;
    stats.alertsBySeverity[alert.severity] = (stats.alertsBySeverity[alert.severity] || 0) + 1;
    stats.maxSeverity = Math.max(stats.maxSeverity, alert.severity);

    const severity = '🔴🟠🟡🟢'.charAt(Math.min(3, Math.floor(10 - alert.severity / 2)));

    console.log(`
${severity} 告警 #${stats.totalAlerts}
   交易所: ${alert.exchange}
   币对: ${alert.symbol}
   类型: ${alert.detectionType}
   方向: ${alert.side}
   风险: ${alert.severity}/10 (置信度: ${(alert.confidence * 100).toFixed(0)}%)
   时间: ${new Date(alert.timestamp).toLocaleTimeString('zh-CN')}
   ${
     alert.metrics.tradeQty
       ? `成交量: ${alert.metrics.tradeQty.toFixed(2)}`
       : alert.metrics.slippagePercent
         ? `滑点: ${alert.metrics.slippagePercent.toFixed(2)}%`
         : `深度消耗: ${alert.metrics.orderBookDepthConsumed}`
   }
    `);
  });

  // 监听处理器统计
  const statsInterval = setInterval(() => {
    const health = manager.healthCheck();
    const processorStats = manager.getStats();

    console.log(`\n📊 [${new Date().toLocaleTimeString('zh-CN')}] 实时统计`);
    console.log('   系统状态:', health.healthy ? '✅ 健康' : '❌ 异常');

    let totalDepthUpdates = 0;
    let totalTrades = 0;

    Object.entries(processorStats).forEach(([symbol, stat]) => {
      totalDepthUpdates += stat.totalDepthUpdates;
      totalTrades += stat.totalTrades;
      console.log(
        `   ${symbol}: 深度更新 ${stat.totalDepthUpdates}, 成交 ${stat.totalTrades}, 告警 ${stat.totalAlerts}`
      );
    });

    console.log(
      `   累计告警: ${stats.totalAlerts} (深度更新: ${totalDepthUpdates}, 成交: ${totalTrades})`
    );

    if (stats.totalAlerts > 0) {
      console.log('   告警分布:');
      Object.entries(stats.alertsByType).forEach(([type, count]) => {
        console.log(`     - ${type}: ${count}`);
      });
    }

    // 连接状态
    Object.entries(health.processors).forEach(([symbol, processorHealth]) => {
      console.log(`   ${symbol}: ${processorHealth.healthy ? '✅' : '❌'}`);
    });

    stats.depthUpdates = totalDepthUpdates;
    stats.trades = totalTrades;
  }, 10000); // 每10秒输出一次

  try {
    console.log('🔌 连接中...\n');
    await manager.initialize();

    console.log('✅ Binance WebSocket 已连接！\n');
    console.log('📡 实时监控开始，等待数据...\n');
    console.log('按 Ctrl+C 停止监控\n');
    console.log('-'.repeat(70) + '\n');

    // 运行60秒后停止（确保充分测试）
    const testDuration = 60000; // 60秒
    const shutdownTimer = setTimeout(async () => {
      console.log('\n' + '='.repeat(70));
      console.log('📊 测试完成 - 最终统计');
      console.log('='.repeat(70) + '\n');

      const finalHealth = manager.healthCheck();
      const finalStats = manager.getStats();

      console.log(`运行时长: ${((Date.now() - stats.startTime) / 1000).toFixed(1)}秒`);
      console.log(`\n系统状态: ${finalHealth.healthy ? '✅ 健康' : '❌ 异常'}`);

      console.log('\n📈 数据统计:');
      let totalDepthUpdates = 0;
      let totalTrades = 0;
      let totalAlerts = 0;

      Object.entries(finalStats).forEach(([symbol, stat]) => {
        totalDepthUpdates += stat.totalDepthUpdates;
        totalTrades += stat.totalTrades;
        totalAlerts += stat.totalAlerts;
        console.log(`  ${symbol}:`);
        console.log(`    - 深度更新: ${stat.totalDepthUpdates}`);
        console.log(`    - 成交数据: ${stat.totalTrades}`);
        console.log(`    - 生成告警: ${stat.totalAlerts}`);
      });

      console.log(`\n总计:`);
      console.log(`  - 深度更新: ${totalDepthUpdates}`);
      console.log(`  - 成交数据: ${totalTrades}`);
      console.log(`  - 生成告警: ${stats.totalAlerts}`);

      if (stats.totalAlerts > 0) {
        console.log('\n🚨 告警分布:');
        Object.entries(stats.alertsByType).forEach(([type, count]) => {
          console.log(`  ${type}: ${count}条`);
        });

        console.log('\n⚠️ 风险等级分布:');
        Object.entries(stats.alertsBySeverity).forEach(([severity, count]) => {
          console.log(`  ${severity}/10: ${count}条`);
        });

        console.log(`\n最高风险等级: ${stats.maxSeverity}/10`);
      } else {
        console.log('\nℹ️ 在监控期间未检测到异常事件（正常情况）');
        console.log('   - 大额成交阈值: BTC > 50, ETH > 500');
        console.log('   - 如市场活跃度低，可能无告警');
      }

      console.log('\n✅ 验证结果:');
      console.log(`  数据流: ${totalDepthUpdates > 0 ? '✅ 正常' : '❌ 异常'}`);
      console.log(`  实时性: ${totalTrades > 0 ? '✅ 正常' : '❌ 异常'}`);
      console.log(`  系统: ${finalHealth.healthy ? '✅ 健康' : '❌ 异常'}`);

      // 总体判断
      const isValid =
        finalHealth.healthy && totalDepthUpdates > 0 && totalTrades > 0;

      console.log(`\n${isValid ? '🎉' : '⚠️'} 测试${isValid ? '通过' : '不完整'}`);

      if (!isValid) {
        console.log('   可能原因:');
        if (!finalHealth.healthy) console.log('   - 连接异常');
        if (totalDepthUpdates === 0) console.log('   - 未接收深度数据');
        if (totalTrades === 0) console.log('   - 未接收成交数据');
      }

      console.log('');
      console.log('='.repeat(70) + '\n');

      // 清理并退出
      clearInterval(statsInterval);
      unsubscribe();
      manager.shutdown();

      process.exit(isValid ? 0 : 1);
    }, testDuration);

    // 处理Ctrl+C
    process.on('SIGINT', async () => {
      console.log('\n\n⏹️  停止监控...\n');
      clearTimeout(shutdownTimer);
      clearInterval(statsInterval);
      unsubscribe();
      manager.shutdown();
      process.exit(0);
    });
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    console.error('');

    if ((error as any).message.includes('ENOTFOUND')) {
      console.error('可能原因: 网络连接问题（无法解析stream.binance.com）');
      console.error('解决方案: 检查网络连接或尝试使用VPN');
    } else if ((error as any).message.includes('Invalid API')) {
      console.error('可能原因: API key无效或过期');
      console.error('解决方案: 检查.env文件中的API key是否正确');
    } else if ((error as any).message.includes('timeout')) {
      console.error('可能原因: 连接超时');
      console.error('解决方案: 检查网络连接或Binance服务状态');
    }

    clearInterval(statsInterval);
    unsubscribe();
    manager.shutdown();
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runRealtimeTest().catch(console.error);
}

export { runRealtimeTest };
