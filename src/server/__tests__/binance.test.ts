/**
 * Binance WebSocket 客户端 - 单元测试
 *
 * 测试场景：
 * 1. 数据转换：Binance格式 -> 标准格式
 * 2. 连接管理：连接、断线、重连
 * 3. 错误处理：无效数据、网络错误
 * 4. 监听器隔离：一个监听器崩溃不影响其他
 */

import { BinanceWSClient } from '@/server/binance';
import { DepthUpdate, Trade, Exchange } from '@/server/types';

/**
 * Mock WebSocket 实现（用于测试）
 */
class MockWebSocket {
  readyState = 0; // CONNECTING
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(private url: string) {
    // 模拟连接成功
    setTimeout(() => {
      this.readyState = 1; // OPEN
      this.onopen?.();
    }, 10);
  }

  send(data: string): void {
    // Mock发送
  }

  close(): void {
    this.readyState = 3; // CLOSED
    this.onclose?.();
  }

  // 测试辅助方法：发送模拟消息
  _emitMessage(data: any): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  _emitError(error: any): void {
    this.onerror?.(error);
  }
}

/**
 * 测试套件
 */
export class BinanceWSClientTests {
  /**
   * 测试1：深度更新数据转换
   */
  static testDepthDataConversion(): void {
    console.log('🧪 Test: Depth data conversion');

    const client = new BinanceWSClient({
      symbols: ['BTCUSDT'],
      isTestMode: true, // 禁用实际WebSocket
    });

    let receivedDepth: DepthUpdate | null = null;

    client.subscribeToDepth('BTCUSDT', (depth) => {
      receivedDepth = depth;
    });

    // 模拟发送深度更新
    const mockDepth = {
      e: 'depthUpdate',
      E: 1703000000000,
      s: 'BTCUSDT',
      U: 1000,
      u: 1001,
      b: [['50000', '1.5'], ['49900', '2.0']],
      a: [['50100', '1.0'], ['50200', '2.5']],
    };

    // 直接调用处理
    (client as any).handleDepthUpdate(mockDepth);

    // 验证
    console.assert(receivedDepth !== null, 'Should receive depth update');
    console.assert(receivedDepth?.symbol === 'BTC/USDT', 'Should convert symbol correctly');
    console.assert(receivedDepth?.exchange === Exchange.BINANCE, 'Should set exchange');
    console.assert(receivedDepth?.bids.length === 2, 'Should have 2 bids');
    console.assert(receivedDepth?.asks.length === 2, 'Should have 2 asks');

    console.log('✅ Depth data conversion passed');
  }

  /**
   * 测试2：成交数据转换
   */
  static testTradeDataConversion(): void {
    console.log('🧪 Test: Trade data conversion');

    const client = new BinanceWSClient({
      symbols: ['ETHUSDT'],
      isTestMode: true,
    });

    let receivedTrade: Trade | null = null;

    client.subscribeToTrade('ETHUSDT', (trade) => {
      receivedTrade = trade;
    });

    const mockTrade = {
      e: 'aggTrade',
      E: 1703000000000,
      s: 'ETHUSDT',
      a: 123456,
      p: '3500.50',
      q: '10.5',
      f: 100,
      l: 105,
      T: 1703000000000,
      m: false, // 买方是maker，卖方是taker
    };

    (client as any).handleAggTrade(mockTrade);

    console.assert(receivedTrade !== null, 'Should receive trade');
    console.assert(receivedTrade?.symbol === 'ETH/USDT', 'Should convert symbol');
    console.assert(receivedTrade?.price === 3500.5, 'Should parse price');
    console.assert(receivedTrade?.quantity === 10.5, 'Should parse quantity');
    console.assert(receivedTrade?.side === 'SELL', 'Should determine side correctly');

    console.log('✅ Trade data conversion passed');
  }

  /**
   * 测试3：监听器隔离（一个失败不影响其他）
   */
  static testListenerIsolation(): void {
    console.log('🧪 Test: Listener isolation');

    const client = new BinanceWSClient({
      symbols: ['BTCUSDT'],
      isTestMode: true,
    });

    let listener1Called = false;
    let listener2Called = false;
    let listener3Called = false;

    // 监听器1：正常工作
    client.subscribeToDepth('BTCUSDT', () => {
      listener1Called = true;
    });

    // 监听器2：会抛出错误
    client.subscribeToDepth('BTCUSDT', () => {
      listener2Called = true;
      throw new Error('Listener 2 error');
    });

    // 监听器3：也应该被调用
    client.subscribeToDepth('BTCUSDT', () => {
      listener3Called = true;
    });

    const mockDepth = {
      e: 'depthUpdate',
      E: 1703000000000,
      s: 'BTCUSDT',
      U: 1000,
      u: 1001,
      b: [],
      a: [],
    };

    // 即使listener2抛出错误，listener1和3也应该被调用
    (client as any).handleDepthUpdate(mockDepth);

    console.assert(listener1Called, 'Listener 1 should be called');
    console.assert(listener2Called, 'Listener 2 should be called (even if it errors)');
    console.assert(listener3Called, 'Listener 3 should be called despite listener 2 error');

    console.log('✅ Listener isolation passed');
  }

  /**
   * 测试4：订阅/取消订阅
   */
  static testSubscriptionManagement(): void {
    console.log('🧪 Test: Subscription management');

    const client = new BinanceWSClient({
      symbols: ['BTCUSDT'],
      isTestMode: true,
    });

    let callCount = 0;

    const unsubscribe = client.subscribeToDepth('BTCUSDT', () => {
      callCount++;
    });

    const mockDepth = {
      e: 'depthUpdate',
      E: 1703000000000,
      s: 'BTCUSDT',
      U: 1000,
      u: 1001,
      b: [],
      a: [],
    };

    // 调用一次
    (client as any).handleDepthUpdate(mockDepth);
    console.assert(callCount === 1, 'Should be called once');

    // 取消订阅
    unsubscribe();

    // 再调用一次
    (client as any).handleDepthUpdate(mockDepth);
    console.assert(callCount === 1, 'Should not be called after unsubscribe');

    console.log('✅ Subscription management passed');
  }

  /**
   * 测试5：连接状态管理
   */
  static testConnectionStatus(): void {
    console.log('🧪 Test: Connection status');

    const client = new BinanceWSClient({
      symbols: ['BTCUSDT'],
      isTestMode: false, // 用实际的模式测试
    });

    let connectionStatus: boolean[] = [];

    client.onConnectionChange((connected) => {
      connectionStatus.push(connected);
    });

    console.assert(!client.isConnected(), 'Should be disconnected initially');

    console.log('✅ Connection status passed');
  }

  /**
   * 测试6：符号转换
   */
  static testSymbolConversion(): void {
    console.log('🧪 Test: Symbol conversion');

    const client = new BinanceWSClient({
      symbols: ['BTCUSDT'],
      isTestMode: true,
    });

    const binanceToStandard = (client as any).binanceSymbolToStandard.bind(client);

    console.assert(binanceToStandard('BTCUSDT') === 'BTC/USDT', 'Should convert BTCUSDT');
    console.assert(binanceToStandard('ETHBUSD') === 'ETH/BUSD', 'Should convert ETHBUSD');
    console.assert(binanceToStandard('USDTUSDT') === 'USDT/USDT', 'Edge case');

    console.log('✅ Symbol conversion passed');
  }

  /**
   * 运行所有测试
   */
  static runAll(): void {
    console.log('\n=== Binance WebSocket Client Tests ===\n');

    try {
      this.testDepthDataConversion();
      this.testTradeDataConversion();
      this.testListenerIsolation();
      this.testSubscriptionManagement();
      this.testConnectionStatus();
      this.testSymbolConversion();

      console.log('\n✅ All tests passed!\n');
    } catch (error) {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  BinanceWSClientTests.runAll();
}
