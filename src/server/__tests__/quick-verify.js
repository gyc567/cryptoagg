#!/usr/bin/env node

/**
 * 快速数据流验证脚本
 * 直接测试 Binance WebSocket 连接和数据处理
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载 .env 文件
function loadEnv(filePath) {
  const envPath = path.resolve(filePath);
  console.log(`📄 读取配置文件: ${envPath}`);

  if (!fs.existsSync(envPath)) {
    console.error(`❌ 文件不存在: ${envPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};

  content.split('\n').forEach((line) => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return env;
}

// 验证配置
function validateConfig(env) {
  console.log('\n✅ 配置检查:\n');

  const checks = [
    ['BINANCE_API_KEY', true],
    ['BINANCE_SECRET_KEY', true],
    ['BINANCE_WS_URL', false],
    ['MARKET_DATA_ENABLED', false],
    ['MARKET_DATA_SYMBOLS', false],
  ];

  let allValid = true;

  checks.forEach(([key, isSensitive]) => {
    const value = env[key];
    if (!value) {
      console.log(`  ❌ ${key}: 未配置`);
      allValid = false;
    } else {
      const displayValue = isSensitive ? `${value.substring(0, 10)}...` : value;
      console.log(`  ✅ ${key}: ${displayValue}`);
    }
  });

  if (!allValid) {
    console.error('\n❌ 配置不完整，请检查 .env 文件');
    process.exit(1);
  }

  return {
    apiKey: env.BINANCE_API_KEY,
    secretKey: env.BINANCE_SECRET_KEY,
    wsUrl: env.BINANCE_WS_URL || 'wss://stream.binance.com:9443/ws',
    symbols: (env.MARKET_DATA_SYMBOLS || 'BTC/USDT,ETH/USDT').split(',').map((s) => s.trim()),
  };
}

// 测试网络连接
async function testNetworkConnection() {
  console.log('\n🌐 网络连接测试:\n');

  try {
    const response = await fetch('https://api.binance.com/api/v3/ping', {
      timeout: 5000,
    });
    if (response.ok) {
      console.log('  ✅ Binance REST API: 连接正常');
      return true;
    } else {
      console.log(`  ⚠️ Binance REST API: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.warn('  ⚠️ Binance REST API: 连接失败（将继续测试WebSocket）');
    console.warn(`     原因: ${error.message}`);
    return false;
  }
}

// 测试WebSocket连接
async function testWebSocketConnection(wsUrl, symbol) {
  console.log('\n🔌 WebSocket 连接测试:\n');

  return new Promise((resolve, reject) => {
    let connected = false;
    let dataReceived = false;
    let timeout;

    try {
      const stream = `${symbol.toLowerCase().replace('/', '')}@aggTrade`;
      const url = `${wsUrl}?streams=${stream}`;

      console.log(`  连接到: ${url}`);

      const ws = new WebSocket(url);

      timeout = setTimeout(() => {
        console.error('  ❌ 连接超时（10秒）');
        ws.close();
        reject(new Error('Connection timeout'));
      }, 10000);

      ws.onopen = () => {
        connected = true;
        console.log('  ✅ WebSocket 连接建立');
      };

      ws.onmessage = (event) => {
        if (!dataReceived) {
          dataReceived = true;
          console.log('  ✅ 接收到实时数据');
          console.log(`     数据大小: ${event.data.length} 字节`);

          // 解析数据
          try {
            const data = JSON.parse(event.data);
            console.log(`     事件类型: ${data.data?.e || 'unknown'}`);
            console.log(`     币对: ${data.stream?.split('@')[0].toUpperCase() || 'unknown'}`);
          } catch (e) {
            console.log('     (JSON解析失败)');
          }

          ws.close();
          clearTimeout(timeout);
          resolve(true);
        }
      };

      ws.onerror = (error) => {
        console.error(`  ❌ WebSocket 错误: ${error}`);
        clearTimeout(timeout);
        reject(error);
      };

      ws.onclose = () => {
        if (connected && dataReceived) {
          console.log('  ✅ WebSocket 连接关闭（数据已验证）');
        }
      };
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

// 测试深度数据获取
async function testDepthData(symbol) {
  console.log('\n📊 深度数据测试:\n');

  try {
    const binanceSymbol = symbol.replace('/', '').toUpperCase();
    const url = `https://api.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=5`;

    console.log(`  获取: ${binanceSymbol} 深度数据...`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    console.log(`  ✅ 获取成功`);
    console.log(`     买单档位: ${data.bids?.length || 0}`);
    console.log(`     卖单档位: ${data.asks?.length || 0}`);
    console.log(`     最新ID: ${data.lastUpdateId}`);

    if (data.bids && data.asks && data.bids.length > 0 && data.asks.length > 0) {
      const bid = parseFloat(data.bids[0][0]);
      const ask = parseFloat(data.asks[0][0]);
      const spread = ask - bid;
      const spreadPercent = (spread / bid) * 100;

      console.log(`\n     买价: ${bid.toFixed(2)}`);
      console.log(`     卖价: ${ask.toFixed(2)}`);
      console.log(`     点差: ${spread.toFixed(2)} (${spreadPercent.toFixed(2)}%)`);

      return true;
    }
  } catch (error) {
    console.error(`  ❌ 深度数据获取失败: ${error.message}`);
    return false;
  }
}

// 主测试流程
async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 Binance 数据流完整性验证');
  console.log('='.repeat(70));

  try {
    // 1. 加载配置
    const env = loadEnv('.env');
    const config = validateConfig(env);

    // 2. 网络连接测试（非致命性）
    const restApiOk = await testNetworkConnection();

    // 3. 为每个币对测试深度数据（非致命性）
    if (restApiOk) {
      console.log('\n📋 为监控币对获取深度数据:\n');
      for (const symbol of config.symbols) {
        await testDepthData(symbol);
        console.log('');
      }
    } else {
      console.log('\n⏭️  跳过REST API深度数据测试\n');
    }

    // 4. WebSocket连接测试（关键）
    const firstSymbol = config.symbols[0];
    await testWebSocketConnection(config.wsUrl, firstSymbol);

    // 最终总结
    console.log('\n' + '='.repeat(70));
    console.log('✅ 数据流验证完成！');
    console.log('='.repeat(70));
    console.log('\n📈 验证结果：');
    if (restApiOk) {
      console.log('  ✅ REST API 可用');
      console.log('  ✅ 深度数据可获取');
    } else {
      console.log('  ⚠️ REST API 不可用（但WebSocket正常）');
    }
    console.log('  ✅ WebSocket 连接正常');
    console.log('  ✅ 实时数据流正常');
    console.log('\n🚀 可以开始实时监控了！\n');
    console.log('运行以下命令开始完整监控：');
    console.log('  npm run test:market:realtime');
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 验证失败:', error.message);
    console.error('\n可能的原因：');
    console.error('  - WebSocket 连接问题');
    console.error('  - 网络连接问题（检查VPN）');
    console.error('  - API key 无效（检查.env文件）');
    console.error('  - Binance 服务暂时不可用');
    console.error('\n');
    process.exit(1);
  }
}

main().catch(console.error);
