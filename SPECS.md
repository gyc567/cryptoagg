# 交易所市价吃单监控系统 - 功能规范

**版本**：1.0
**状态**：设计阶段
**作者**：System Architect
**日期**：2025-12-22

---

## 1. 系统概述

### 1.1 目标
实时检测加密货币交易所的大额市价单吃单行为，在发生时立即告警，以便捕捉市场异常和可能的操纵信号。

### 1.2 核心指标
- **检测延迟**：<500ms（从成交到告警）
- **准确率**：>95%（基于历史回测）
- **支持交易所**：Binance、OKX、Bybit、Coinbase、Kraken
- **吞吐量**：支持5000+ 币对实时监控

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    前端展示层（React）                       │
│              MarketOrderFeed + RealTime Updates            │
└────────────────┬────────────────────────────────────────────┘
                 │ (WebSocket/Server-Sent Events)
┌────────────────▼────────────────────────────────────────────┐
│                    后端核心处理层                            │
│ ┌──────────────┬──────────────┬──────────────────────────┐ │
│ │ WebSocket    │  OrderBook   │   Market Taker Detector │ │
│ │ Manager      │  Manager     │   (Detection Logic)     │ │
│ └──────────────┴──────────────┴──────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │           Event Stream & Signal Aggregation             │ │
│ └──────────────────────────────────────────────────────────┘ │
└────────┬──────────────────────────────────────────────────────┘
         │ (存储)
┌────────▼──────────────────────────────────────────────────────┐
│           Data Layer (Redis/Database)                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. 核心模块设计

### 3.1 订单簿管理器（OrderBook Manager）

**职责**：维护本地订单簿快照，应用增量更新

**输入**：
- 交易所深度初始化数据 (`/depth` REST API)
- 深度增量更新 (`@depth@100ms` WebSocket)
- 成交数据 (`@aggTrade` or `@trade` WebSocket)

**输出**：
- 当前最新的 `(bids: [], asks: [])` 快照
- 深度变化事件流 `DepthUpdateEvent`

**算法**：
```typescript
OrderBook {
  symbol: string;
  bids: Map<price, quantity>;  // 价格 -> 数量
  asks: Map<price, quantity>;
  lastUpdateId: number;

  applyDepthUpdate(update: DepthUpdate) {
    // 确保更新序列号连续（处理乱序）
    // 应用bid/ask更新
    // 删除数量为0的档位
    // 触发 DepthUpdateEvent
  }

  getSlippage(side: 'BUY' | 'SELL', quantity: number): {
    price: number;
    slippagePercent: number;
  }
}
```

### 3.2 WebSocket管理器（WebSocket Manager）

**职责**：维护与交易所的长连接，处理断连/重连

**特性**：
- 自动重连（指数退避：1s, 2s, 4s, 8s, 30s）
- 连接池（每个交易所/币对独立连接）
- 心跳检测（检测僵尸连接）
- 本地缓冲（网络抖动时暂存消息）

**接口**：
```typescript
class ExchangeWSManager {
  subscribe(symbol: string, channels: 'depth' | 'trades'[]): Observable<Event>;
  unsubscribe(symbol: string): void;
  getConnectionStatus(): { connected: boolean; latency: number };
}
```

### 3.3 吃单检测器（Market Taker Detector）

**检测维度**：

#### 3.3.1 单笔大额成交
```
条件：trade.qty > THRESHOLD[币对]
示例：BTC成交量 > 50枚 → 告警
风险等级：根据成交额/日均成交额比例判断（1-10分）
```

#### 3.3.2 订单簿瞬间失衡
```
条件：
- 单次深度更新删除 > 深度档位数的30%
- 或者 ask[0] - bid[0] 突变 > 正常波差的5倍

示例：
  前状态：bid[0]=98000, ask[0]=98010 (spread=10)
  后状态：bid[0]=97980, ask[0]=98030 (spread=50) → 告警
```

#### 3.3.3 滑点异常
```
条件：
执行市价买单模拟，消耗前N档(N=5,10,20)的流动性
如果平均价格偏离mid_price > 2% → 告警

示例：
  mid_price = 50000
  购买100000 USDT BTC
  实际执行价格 = 50500 (高于mid 1%)
  滑点 = 1% < 阈值，通过
```

### 3.4 检测结果定义

```typescript
interface MarketTakerAlert {
  id: string;
  timestamp: number;           // Unix毫秒
  exchange: string;            // 'BINANCE' | 'OKX' | ...
  symbol: string;              // 'BTC/USDT'
  side: 'BUY' | 'SELL';

  detectionType:
    | 'LARGE_TRADE'           // 单笔大额成交
    | 'ORDERBOOK_IMBALANCE'   // 订单簿失衡
    | 'SLIPPAGE_SPIKE';       // 滑点异常

  severity: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;  // 1-10分

  metrics: {
    tradeQty?: number;                  // 成交量（币）
    tradeValue?: number;                // 成交额（USDT）
    slippagePercent?: number;           // 滑点百分比
    orderBookDepthConsumed?: number;    // 消耗的档位数
    volumeRatioVsDailyAvg?: number;     // 相对日均成交量比例
  };

  confidence: number;  // 0-1，综合置信度

  // 上下文信息（用于溯源）
  context: {
    midPrice: number;
    spread: number;
    bidDepth5: number;     // 前5档买单总量
    askDepth5: number;
    previousAlert?: string;  // 相关的上一个告警ID
  };
}
```

---

## 4. 数据流处理

### 4.1 初始化流程
```
1. 订阅币对 →
2. 获取深度初始化快照 (GET /depth?limit=100) →
3. 构建本地OrderBook →
4. 订阅WebSocket增量更新 →
5. 同步断点检查（使用lastUpdateId防止漏单）
```

### 4.2 实时更新流程
```
WebSocket Event (per 100ms) →
  检查更新序号连续性 →
    应用到OrderBook →
      触发DepthUpdateEvent →
        Market Taker Detector消费 →
          分析触发条件 →
            生成Alert →
              发送到前端 (via SSE/WebSocket)
```

### 4.3 容错机制
- **乱序处理**：缓冲乱序消息，等待延迟消息补到
- **断连处理**：断连时冻结OrderBook，重连后重新初始化
- **重复消息**：使用事件ID去重

---

## 5. 配置参数

```typescript
interface DetectionConfig {
  // 交易所配置
  exchanges: {
    [key: string]: {
      enabled: boolean;
      wsUrl: string;
      restUrl: string;
      rateLimit: number;  // 请求数/秒
    }
  };

  // 币对阈值
  pairThresholds: {
    [symbol: string]: {
      largeTradeQtyThreshold: number;    // 大额成交量阈值（币）
      minSlippagePercent: number;        // 最小滑点告警%
      orderBookImbalanceRatio: number;   // 档位消失比例
      dailyVolumeCheckEnabled: boolean;
    }
  };

  // 全局参数
  global: {
    detectionDepthLevels: number[];      // [5, 10, 20]
    bufferWindowMs: number;              // 乱序缓冲窗口 200ms
    alertAggregationWindowMs: number;   // 相同告警合并窗口 1000ms
  };
}
```

---

## 6. 实现时间线

### Phase 1：核心数据层（1周）
- [ ] 实现 OrderBook Manager（支持Binance）
- [ ] 实现 WebSocket Manager（基础连接池）
- [ ] 单元测试 + 集成测试

### Phase 2：检测逻辑（1周）
- [ ] 实现 Market Taker Detector
- [ ] 3个检测维度算法完整实现
- [ ] 告警汇聚和去重

### Phase 3：前端集成（3天）
- [ ] 从后端SSE接收告警
- [ ] MarketOrderFeed 实时更新
- [ ] 告警视觉化和详情页

### Phase 4：扩展和优化（1周）
- [ ] 支持OKX/Bybit/Coinbase
- [ ] 性能优化（缓存策略）
- [ ] 历史数据回测验证

---

## 7. 测试计划

### 单元测试
- OrderBook更新算法
- 滑点计算
- 告警生成逻辑

### 集成测试
- 多交易所并行监控
- 断连自动重连
- 数据一致性验证

### 回测验证
- 使用历史数据重放
- 对比第三方工具（CryptoMeter）
- 假阳性率分析

---

## 8. 非功能需求

| 需求 | 指标 |
|------|------|
| 响应延迟 | <500ms（从成交到告警） |
| 系统可用性 | 99.5% |
| 数据准确率 | >95%（基于回测） |
| 并发币对数 | 支持5000+ |
| 成本 | WebSocket带宽控制在10MB/s以内 |

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解方案 |
|------|------|---------|
| 交易所API超额 | 限流 | 使用CCXT Pro统一接口，自动速率控制 |
| WebSocket乱序/延迟 | 漏单 | 缓冲+重排，超时后重初始化 |
| 本地OrderBook与实际不同步 | 误报 | 定期校验（5分钟做一次完整快照对比） |
| 高波动期告警爆炸 | 告警疲劳 | 时间窗口去重+严重级别分级 |

---

**附注**：
本规范遵循Linus哲学 — 消除边界情况，简洁优雅，实用为先。代码应当可读、自解释，避免过度设计。
