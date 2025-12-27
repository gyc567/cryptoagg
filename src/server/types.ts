/**
 * 市价吃单监控 - 核心类型定义
 *
 * 该模块定义了系统中所有的数据结构和枚举类型
 * 遵循单一职责：纯数据定义，零业务逻辑
 */

// ============================================================================
// 枚举和常量
// ============================================================================

export enum Exchange {
  BINANCE = 'BINANCE',
  OKX = 'OKX',
  BYBIT = 'BYBIT',
  COINBASE = 'COINBASE',
  KRAKEN = 'KRAKEN',
}

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum DetectionType {
  LARGE_TRADE = 'LARGE_TRADE',
  ORDERBOOK_IMBALANCE = 'ORDERBOOK_IMBALANCE',
  SLIPPAGE_SPIKE = 'SLIPPAGE_SPIKE',
}

export type Severity = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// ============================================================================
// 订单簿相关类型
// ============================================================================

export interface PriceLevel {
  price: number;
  quantity: number;
}

export interface OrderBookSnapshot {
  symbol: string;
  exchange: Exchange;
  timestamp: number;
  bids: PriceLevel[];
  asks: PriceLevel[];
  lastUpdateId: number;
}

export interface DepthUpdate {
  symbol: string;
  exchange: Exchange;
  timestamp: number;
  eventTime: number;
  firstUpdateId: number;
  lastUpdateId: number;
  bids: [price: string, qty: string][];
  asks: [price: string, qty: string][];
}

// ============================================================================
// 成交数据相关类型
// ============================================================================

export interface Trade {
  symbol: string;
  exchange: Exchange;
  timestamp: number;
  tradeId: string | number;
  price: number;
  quantity: number;
  side: OrderSide;
  isBuyerMaker: boolean;
}

// ============================================================================
// 告警相关类型
// ============================================================================

export interface MarketTakerAlertMetrics {
  tradeQty?: number;
  tradeValue?: number;
  slippagePercent?: number;
  orderBookDepthConsumed?: number;
  volumeRatioVsDailyAvg?: number;
}

export interface MarketTakerAlertContext {
  midPrice: number;
  spread: number;
  bidDepth5: number;
  askDepth5: number;
  previousAlertId?: string;
}

export interface MarketTakerAlert {
  id: string;
  timestamp: number;
  exchange: Exchange;
  symbol: string;
  side: OrderSide;
  detectionType: DetectionType;
  severity: Severity;
  metrics: MarketTakerAlertMetrics;
  confidence: number;
  context: MarketTakerAlertContext;
}

// ============================================================================
// 大额转账/交易监控类型
// ============================================================================

export interface LargeTransfer {
  txId: string;
  amount: number;
  currency: string;
  fromAddress: string;
  toAddress: string;
  timestamp: number;
  exchange: string;
  value: string; // Formatted value e.g. "$1.2M"
  direction: 'in' | 'out'; // 'in' = Buy (Inflow to base asset), 'out' = Sell (Outflow from base asset)
}

// ============================================================================
// 配置相关类型
// ============================================================================

export interface ExchangeConfig {
  enabled: boolean;
  wsUrl: string;
  restUrl: string;
  rateLimit: number;
}

export interface PairThreshold {
  largeTradeQtyThreshold: number;
  minSlippagePercent: number;
  orderBookImbalanceRatio: number;
  dailyVolumeCheckEnabled: boolean;
}

export interface GlobalDetectionConfig {
  detectionDepthLevels: number[];
  bufferWindowMs: number;
  alertAggregationWindowMs: number;
}

export interface DetectionConfig {
  exchanges: Record<string, ExchangeConfig>;
  pairThresholds: Record<string, PairThreshold>;
  global: GlobalDetectionConfig;
}

// ============================================================================
// WebSocket 连接状态类型
// ============================================================================

export interface WSConnectionStatus {
  connected: boolean;
  latency: number;
  lastMessageTime: number;
  reconnectCount: number;
  lastError?: Error;
}

// ============================================================================
// 事件流类型
// ============================================================================

export type MarketEvent =
  | { type: 'DEPTH_UPDATE'; data: DepthUpdate }
  | { type: 'TRADE'; data: Trade }
  | { type: 'ALERT'; data: MarketTakerAlert };

export interface Observable<T> {
  subscribe(observer: (value: T) => void): () => void;
}
