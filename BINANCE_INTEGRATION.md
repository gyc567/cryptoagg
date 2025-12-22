# Binance WebSocket 集成指南

## 🎯 概览

这个集成将币安（Binance）实时WebSocket数据流连接到市价吃单监控系统。

### 架构

```
Binance WebSocket
      ↓
  BinanceWSClient      (独立、可测试)
      ↓
MarketDataManager      (适配器、工厂模式)
      ↓
MarketDataProcessor    (检测器、告警生成)
      ↓
前端UI / 应用逻辑
```

### 特性

- ✅ **生产级别**：自动重连、错误处理、监听器隔离
- ✅ **高内聚低耦合**：Binance逻辑完全独立
- ✅ **易于测试**：Mock mode、单元测试、集成测试
- ✅ **KISS原则**：简洁直接，无过度设计
- ✅ **可扩展**：容易添加OKX、Bybit等交易所

---

## 🔧 安装和配置

### 1️⃣ 获取Binance API Key

1. 访问 https://www.binance.com/en/account/api-management
2. 创建新的API key
3. **重要**：启用WebSocket权限，但**禁用交易权限**（降低风险）

### 2️⃣ 配置环境变量

复制 `.env.example` 并填入你的API key：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
# ⚠️ 安全提示：这个文件已在 .gitignore 中，不会被提交到git

BINANCE_API_KEY=your_api_key_here
BINANCE_SECRET_KEY=your_secret_key_here

# 可选：自定义配置
BINANCE_WS_URL=wss://stream.binance.com:9443/ws
BINANCE_REST_URL=https://api.binance.com/api/v3
MARKET_DATA_ENABLED=true
MARKET_DATA_SYMBOLS=BTC/USDT,ETH/USDT,SOL/USDT
```

### 3️⃣ 安装依赖

```bash
npm install
```

> 注意：这个实现使用了原生 WebSocket API，不需要额外的npm包

---

## 📚 使用方法

### 方法1：从环境变量初始化（推荐）

```typescript
import { createMarketDataManager } from '@/server/manager';

// 自动从 .env 读取配置
const manager = createMarketDataManager();

await manager.initialize();

// 订阅告警
manager.onAlert((alert) => {
  console.log(`Alert: ${alert.symbol} - Severity ${alert.severity}/10`);
});

// 优雅关闭
manager.shutdown();
```

### 方法2：手动初始化

```typescript
import { MarketDataManager } from '@/server/manager';

const manager = new MarketDataManager({
  binance: {
    enabled: true,
    apiKey: process.env.BINANCE_API_KEY,
    secretKey: process.env.BINANCE_SECRET_KEY,
    symbols: ['BTC/USDT', 'ETH/USDT'],
  },
});

await manager.initialize();
```

### 方法3：测试模式（不需要API key）

```typescript
const manager = new MarketDataManager({
  binance: {
    enabled: true,
    symbols: ['BTC/USDT'],
    isTestMode: true,  // 使用模拟数据
  },
});

await manager.initialize();
```

---

## 🧪 测试

### 运行所有测试

```bash
npm run test:market
```

### 测试模式（无需API key）

```bash
npm run test:market -- test-mode
```

运行以下测试：
- ✅ 数据转换（Binance → 标准格式）
- ✅ 成交数据处理
- ✅ 深度更新处理
- ✅ 大额成交检测
- ✅ 订单簿失衡检测
- ✅ 多币对并行处理
- ✅ 告警去重
- ✅ 监听器隔离
- ✅ 连接管理

### 实时监控（需要API key）

```bash
npm run test:market -- realtime
```

输出每个告警事件及其属性。

---

## 📊 数据流示例

### 1. 初始化

```
1. BinanceWSClient 连接到 wss://stream.binance.com:9443/ws
2. 订阅 BTCUSDT@depth@100ms 和 BTCUSDT@aggTrade
3. 获取 REST API 初始深度快照
4. 创建 OrderBook 实例
```

### 2. 实时数据处理

```
WebSocket 消息
   ↓
BinanceWSClient.handleMessage()
   ↓
转换为标准格式（DepthUpdate / Trade）
   ↓
MarketDataProcessor.processDepthUpdate() / processTrade()
   ↓
MarketTakerDetector 分析
   ↓
生成告警（如果触发检测条件）
   ↓
AlertListener 回调
```

### 3. 告警示例

```json
{
  "id": "alert_20231222_abc123",
  "timestamp": 1703240000000,
  "exchange": "BINANCE",
  "symbol": "BTC/USDT",
  "side": "BUY",
  "detectionType": "LARGE_TRADE",
  "severity": 8,
  "confidence": 0.92,
  "metrics": {
    "tradeQty": 75,
    "tradeValue": 3750000,
    "volumeRatioVsDailyAvg": 0.75
  },
  "context": {
    "midPrice": 50000,
    "spread": 100,
    "bidDepth5": 500,
    "askDepth5": 500
  }
}
```

---

## 🛡️ 错误处理

### 自动重连

```typescript
// BinanceWSClient 包含自动重连逻辑
// 指数退避：1s, 2s, 4s, 8s, ...
// 最多重试5次，然后停止
```

### 监听器隔离

```typescript
// 如果一个监听器抛出错误，其他监听器继续执行
client.subscribeToDepth('BTCUSDT', () => {
  throw new Error('Listener error');  // 不会影响其他监听器
});

client.subscribeToDepth('BTCUSDT', () => {
  console.log('This will still execute');  // ✅ 继续执行
});
```

### 数据一致性

```typescript
// OrderBook.applyDepthUpdate() 检查序号连续性
// 如果检测到缝隙，返回失败信号
// 调用方会重新初始化订单簿
```

---

## 📈 性能监控

### 健康检查

```typescript
const health = manager.healthCheck();
// {
//   healthy: true,
//   processors: {
//     'BTC/USDT': { healthy: true },
//     'ETH/USDT': { healthy: true }
//   },
//   binance: { connected: true }
// }
```

### 统计信息

```typescript
const stats = manager.getStats();
// {
//   'BTC/USDT': {
//     totalDepthUpdates: 1234,
//     totalTrades: 567,
//     totalAlerts: 12,
//     lastUpdateTime: 1703240000000
//   }
// }
```

---

## 🔐 安全最佳实践

### 1. API Key管理

```bash
# ✅ 正确做法
# 1. 在 .env 文件中存储（已在 .gitignore）
# 2. 使用环境变量读取
# 3. 从不在代码/对话中硬编码

# ❌ 错误做法
# - 将key提交到git
# - 在对话/日志中显示key
# - 硬编码在源码中
```

### 2. 权限限制

在Binance的API管理页面：
- ✅ 启用 WebSocket Market Data 权限
- ❌ **禁用** 交易权限（Place/Cancel Order）
- ✅ 启用 IP白名单（添加服务器IP）

### 3. 密钥轮换

```bash
# 定期（如每月）：
# 1. 在Binance生成新的key
# 2. 更新 .env 文件
# 3. 删除旧的key
```

---

## 🐛 常见问题

### Q1: WebSocket连接失败

```
错误：ENOTFOUND stream.binance.com
原因：网络问题或DNS解析失败
解决：
  - 检查网络连接
  - 尝试使用VPN
  - 检查防火墙规则
```

### Q2: API key被拒绝

```
错误：Invalid API key
原因：
  - key已过期或被删除
  - key权限不足（需要WebSocket权限）
解决：
  - 在Binance重新生成key
  - 确保启用了WebSocket权限
```

### Q3: 没有接收到告警

```
可能的原因：
  1. 市场活动不足（没有大额成交）
  2. 阈值设置过高
  3. 币对没有配置

排查步骤：
  1. 检查 .env 中的 MARKET_DATA_SYMBOLS
  2. 查看 config.ts 中的币对阈值
  3. 运行 test-mode 验证逻辑正常
  4. 检查 healthCheck() 状态
```

### Q4: 内存占用持续增长

```
原因：OrderBook 中的历史数据未清理

解决：
  - OrderBook 已有 maxDepthSize 限制（500档）
  - 如果仍有问题，检查监听器是否被正确取消订阅
```

---

## 📝 代码结构

```
src/server/
├── binance.ts              # Binance WebSocket客户端
├── manager.ts              # 市场数据管理器（适配器）
├── processor.ts            # 处理器
├── detector.ts             # 检测器
├── orderbook.ts            # 订单簿
├── config.ts               # 配置
├── types.ts                # 类型
└── __tests__/
    ├── binance.test.ts     # 单元测试
    ├── integration.test.ts # 集成测试
    └── examples.ts         # 示例代码
```

---

## 🚀 部署建议

### 开发环境

```bash
# 使用测试模式
MARKET_DATA_ENABLED=true
BINANCE_API_KEY=xxx
BINANCE_SECRET_KEY=xxx
NODE_ENV=development
```

### 生产环境

```bash
# 使用环境变量管理敏感信息
# 在服务器上设置：
export BINANCE_API_KEY=xxx
export BINANCE_SECRET_KEY=xxx
export MARKET_DATA_SYMBOLS=BTC/USDT,ETH/USDT

# Docker 示例
docker run -e BINANCE_API_KEY=xxx myapp
```

### 监控和告警

```typescript
// 定期输出健康状态
setInterval(() => {
  const health = manager.healthCheck();
  if (!health.healthy) {
    // 发送告警（Slack/邮件/PagerDuty等）
  }
}, 60000);
```

---

## 📖 相关文档

- [SPECS.md](./SPECS.md) - 功能规范
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - 架构设计
- [Binance WebSocket文档](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams)

---

## ✅ 检查清单

使用前，确保你已经：

- [ ] 从 `.env.example` 创建 `.env` 文件
- [ ] 从Binance获取API key
- [ ] 在 `.env` 中设置 API key
- [ ] 运行 `npm run test:market` 验证安装
- [ ] 查看测试输出，确保所有测试都通过
- [ ] 在生产环境前运行 `npm run test:market -- test-mode`
- [ ] 配置日志和监控系统

---

## 🤝 贡献

发现问题？提交Issue或Pull Request。

---

**版本**：1.0
**最后更新**：2025-12-22
**维护者**：System Architect

> "Keep It Simple, Stupid" - 简洁是优雅的灵魂
