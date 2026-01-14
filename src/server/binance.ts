/**
 * Binance WebSocket 客户端
 *
 * 职责：
 * - 连接到Binance WebSocket服务
 * - 订阅深度和成交数据流
 * - 转换为标准数据格式
 * - 处理连接、断线、重连
 *
 * 设计原则（KISS + 高内聚）：
 * - 独立模块，与检测器无关
 * - 通过简单的Observable模式分发数据
 * - 所有Binance特定逻辑封装在这里
 *
 * 测试友好：可注入WebSocket实现
 */

import { Trade, DepthUpdate, Exchange } from '@/server/types';

/**
 * Binance WebSocket 客户端配置
 */
export interface BinanceWSConfig {
  apiKey?: string;
  secretKey?: string;
  wsUrl?: string;
  symbols: string[]; // 例如 ['BTCUSDT', 'ETHUSDT']
  reconnectAttempts?: number;
  reconnectDelay?: number;
  isTestMode?: boolean; // 用于测试
}

/**
 * Binance 深度更新（来自WebSocket）
 */
interface BinanceDepthUpdate {
  e: string; // 事件类型
  E: number; // 事件时间
  s: string; // 币对
  U: number; // 第一个更新ID
  u: number; // 最后更新ID
  b: [string, string][]; // 买单 [price, qty]
  a: [string, string][]; // 卖单 [price, qty]
}

/**
 * Binance 成交数据（来自WebSocket）
 */
interface BinanceAggTrade {
  e: string; // 事件类型
  E: number; // 事件时间
  s: string; // 币对
  a: number; // 成交ID
  p: string; // 价格
  q: string; // 成交量
  f: number; // 首个成交ID
  l: number; // 最后成交ID
  T: number; // 成交时间
  m: boolean; // 是否买方为maker
}

/**
 * Binance 初始深度快照（来自REST API）
 */
interface BinanceDepthSnapshot {
  bids: [string, string][]; // [price, qty]
  asks: [string, string][]; // [price, qty]
  lastUpdateId: number;
}

type DataListener<T> = (data: T) => void;

/**
 * Binance WebSocket 客户端
 *
 * 职责单一：管理WebSocket连接和数据转换
 */
export class BinanceWSClient {
  private config: Required<BinanceWSConfig>;
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectCount: number = 0;

  // 数据监听器
  private depthListeners: Map<string, DataListener<DepthUpdate>[]> = new Map();
  private tradeListeners: Map<string, DataListener<Trade>[]> = new Map();
  private connectionListeners: DataListener<boolean>[] = [];

  // 状态管理
  private initializedSymbols: Set<string> = new Set();
  private depthBuffer: Map<string, BinanceDepthUpdate[]> = new Map();
  private lastUpdateIdMap: Map<string, number> = new Map();

  constructor(config: BinanceWSConfig) {
    this.config = {
      apiKey: config.apiKey || '',
      secretKey: config.secretKey || '',
      wsUrl: config.wsUrl || 'wss://stream.binance.com:9443/ws',
      reconnectAttempts: config.reconnectAttempts || 5,
      reconnectDelay: config.reconnectDelay || 1000,
      isTestMode: config.isTestMode || false,
      ...config,
    };
  }

  /**
   * 连接到Binance WebSocket
   *
   * 流程：
   * 1. 初始化WebSocket连接
   * 2. 订阅深度和成交数据流
   * 3. 收到数据先缓存
   * 4. 获取初始深度快照
   * 5. 合并快照和缓存数据
   * 6. 开始正常处理
   */
  async connect(): Promise<void> {
    try {
      if (this.config.isTestMode) {
        console.log('[Binance] Test mode enabled, starting mock data stream');
        this.emitConnectionStatus(true);
        this.startMockDataStream();
        return;
      }

      await this.initializeWebSocket();
      this.reconnectCount = 0;
    } catch (error) {
      console.error('[Binance] Connection failed:', error);
      this.reconnect();
    }
  }

  private startMockDataStream(): void {
    setInterval(() => {
      this.config.symbols.forEach(symbol => {
        // Mock AggTrade
        const isLarge = Math.random() > 0.95;
        const trade: BinanceAggTrade = {
          e: 'aggTrade',
          E: Date.now(),
          s: symbol,
          a: Math.floor(Math.random() * 1000000),
          p: '95000',
          q: isLarge ? '20' : '0.1',
          f: 1,
          l: 2,
          T: Date.now(),
          m: Math.random() > 0.5
        };
        this.handleAggTrade(trade);

        // Mock DepthUpdate
        if (Math.random() > 0.8) {
          const currentId = this.lastUpdateIdMap.get(symbol) || 0;
          const depth: BinanceDepthUpdate = {
            e: 'depthUpdate',
            E: Date.now(),
            s: symbol,
            U: currentId + 1,
            u: currentId + 2,
            b: [['94900', '10'], ['94800', '20']],
            a: [['95100', '10'], ['95200', '20']]
          };
          this.initializedSymbols.add(symbol);
          this.lastUpdateIdMap.set(symbol, depth.u);
          this.handleDepthUpdate(depth);
        }
      });
    }, 1000);
  }

  /**
   * 初始化WebSocket连接
   */
  private initializeWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const streamNames = this.config.symbols.map((symbol) => [
          `${symbol.toLowerCase()}@depth@100ms`, // 深度数据，100ms推送
          `${symbol.toLowerCase()}@aggTrade`, // 聚合成交数据
        ]);

        const flatStreams = streamNames.flat();
        const wsUrl = `${this.config.wsUrl}?streams=${flatStreams.join('/')}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[Binance] WebSocket connected');
          this.emitConnectionStatus(true);
          
          // 清理之前的状态
          this.depthBuffer.clear();
          this.lastUpdateIdMap.clear();
          this.initializedSymbols.clear();

          // 获取初始深度快照
          this.initializeDepthSnapshots().then(resolve).catch(reject);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('[Binance] WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[Binance] WebSocket closed');
          this.emitConnectionStatus(false);
          this.reconnect();
        };

        // 超时保护
        setTimeout(() => {
          if (this.ws?.readyState === WebSocket.CONNECTING) {
            this.ws?.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 获取初始深度快照
   *
   * 使用REST API获取，避免与WebSocket增量数据同步问题
   */
  private async initializeDepthSnapshots(): Promise<void> {
    // 如果是测试模式，跳过REST API调用
    if (this.config.isTestMode) {
      return;
    }

    for (const symbol of this.config.symbols) {
      if (this.initializedSymbols.has(symbol)) {
        continue;
      }

      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=100`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch depth snapshot for ${symbol}`);
        }

        const data: BinanceDepthSnapshot = await response.json();

        // 触发初始化事件（转换为标准格式）
        const depthUpdate: DepthUpdate = {
          symbol: this.binanceSymbolToStandard(symbol),
          exchange: Exchange.BINANCE,
          timestamp: Date.now(),
          eventTime: Date.now(),
          firstUpdateId: data.lastUpdateId,
          lastUpdateId: data.lastUpdateId,
          bids: data.bids,
          asks: data.asks,
        };

        // 设置最后的更新ID
        this.lastUpdateIdMap.set(symbol, data.lastUpdateId);

        // 分发快照
        this.emitDepthUpdate(symbol, depthUpdate);
        
        // 处理缓存的事件
        this.processBufferedEvents(symbol, data.lastUpdateId);

        this.initializedSymbols.add(symbol);
      } catch (error) {
        console.error(`[Binance] Failed to initialize ${symbol}:`, error);
        // 继续处理其他币对
      }
    }
  }
  
  /**
   * 处理缓存的事件
   * 确保事件序列的正确性：
   * 1. 丢弃 u <= lastUpdateId 的事件
   * 2. 第一个处理的事件应该满足 U <= lastUpdateId + 1 AND u >= lastUpdateId + 1
   * 3. 后续事件应该是连续的
   */
  private processBufferedEvents(symbol: string, snapshotId: number): void {
    const buffer = this.depthBuffer.get(symbol);
    if (!buffer || buffer.length === 0) return;

    let currentLastUpdateId = snapshotId;
    let processedAny = false;

    for (const event of buffer) {
      // 1. 丢弃旧事件
      if (event.u <= currentLastUpdateId) {
        continue;
      }

      // 2. 检查第一个有效事件的衔接性
      if (!processedAny) {
        if (event.U <= currentLastUpdateId + 1 && event.u >= currentLastUpdateId + 1) {
          this.emitBinanceDepthUpdate(event);
          currentLastUpdateId = event.u;
          processedAny = true;
        } else {
            // 如果第一个有效事件就不衔接，说明中间有丢失，这里可能需要重新获取快照
            // 为简单起见，我们打印警告，但在实际生产中应该触发重连/重同步
            console.warn(`[Binance] Gap detected for ${symbol} during buffer processing. Snapshot: ${currentLastUpdateId}, Event U: ${event.U}`);
        }
      } else {
        // 3. 检查后续事件的连续性
        if (event.U === currentLastUpdateId + 1) {
          this.emitBinanceDepthUpdate(event);
          currentLastUpdateId = event.u;
        } else {
          console.warn(`[Binance] Gap detected for ${symbol} in buffer. Prev u: ${currentLastUpdateId}, Current U: ${event.U}`);
           // 可以在这里触发重新同步
        }
      }
    }
    
    // 清空缓存
    this.depthBuffer.delete(symbol);
    // 更新最后ID
    this.lastUpdateIdMap.set(symbol, currentLastUpdateId);
  }

  /**
   * 处理WebSocket消息
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Binance可能会一次发送多条消息
      if (Array.isArray(message)) {
        message.forEach((msg) => this.processMessage(msg));
      } else {
        this.processMessage(message);
      }
    } catch (error) {
      console.error('[Binance] Failed to parse message:', error);
    }
  }

  /**
   * 处理单条消息
   */
  private processMessage(message: any): void {
    const { e: eventType, s: symbol } = message;

    if (!symbol) {
      return;
    }

    try {
      if (eventType === 'depthUpdate') {
        this.handleDepthUpdate(message as BinanceDepthUpdate);
      } else if (eventType === 'aggTrade') {
        this.handleAggTrade(message as BinanceAggTrade);
      }
    } catch (error) {
      console.error('[Binance] Error processing message:', error);
    }
  }

  /**
   * 处理深度更新
   */
  private handleDepthUpdate(message: BinanceDepthUpdate): void {
    const { s: symbol, U: firstUpdateId, u: lastUpdateId } = message;

    // 如果还没初始化完成（没有快照），则缓存
    if (!this.initializedSymbols.has(symbol)) {
      const buffer = this.depthBuffer.get(symbol) || [];
      buffer.push(message);
      this.depthBuffer.set(symbol, buffer);
      return;
    }

    // 已经初始化，检查序列
    const currentLastId = this.lastUpdateIdMap.get(symbol);
    if (currentLastId === undefined) return; // Should not happen if initialized

    // 检查连续性: 新的U应该等于旧的u + 1
    if (firstUpdateId === currentLastId + 1) {
      this.emitBinanceDepthUpdate(message);
      this.lastUpdateIdMap.set(symbol, lastUpdateId);
    } else if (firstUpdateId > currentLastId + 1) {
      console.warn(`[Binance] Packet loss detected for ${symbol}. Local: ${currentLastId}, Remote U: ${firstUpdateId}`);
      // 可以在这里触发重新初始化
      // this.initializedSymbols.delete(symbol);
      // this.initializeDepthSnapshots(); 
    } else {
        // firstUpdateId <= currentLastId: 忽略旧包或重复包
    }
  }

  private emitBinanceDepthUpdate(message: BinanceDepthUpdate): void {
      const standardSymbol = this.binanceSymbolToStandard(message.s);

      const depthUpdate: DepthUpdate = {
        symbol: standardSymbol,
        exchange: Exchange.BINANCE,
        timestamp: message.E,
        eventTime: message.E,
        firstUpdateId: message.U,
        lastUpdateId: message.u,
        bids: message.b,
        asks: message.a,
      };
      
      this.emitDepthUpdate(message.s, depthUpdate);
  }

  private emitDepthUpdate(symbol: string, depthUpdate: DepthUpdate): void {
    // 分发给监听器
    const listeners = this.depthListeners.get(symbol) || [];
    listeners.forEach((listener) => {
      try {
        listener(depthUpdate);
      } catch (error) {
        console.error('[Binance] Error in depth listener:', error);
      }
    });
  }

  /**
   * 处理聚合成交
   */
  private handleAggTrade(message: BinanceAggTrade): void {
    const standardSymbol = this.binanceSymbolToStandard(message.s);

    const trade: Trade = {
      symbol: standardSymbol,
      exchange: Exchange.BINANCE,
      timestamp: message.T,
      tradeId: `${message.a}`,
      price: parseFloat(message.p),
      quantity: parseFloat(message.q),
      side: message.m ? 'SELL' : 'BUY', // m=true时买方是maker，说明卖方是taker
      isBuyerMaker: !message.m,
    };

    // 分发给监听器
    const listeners = this.tradeListeners.get(message.s) || [];
    listeners.forEach((listener) => {
      try {
        listener(trade);
      } catch (error) {
        console.error('[Binance] Error in trade listener:', error);
      }
    });
  }

  /**
   * 订阅深度更新
   */
  subscribeToDepth(symbol: string, listener: DataListener<DepthUpdate>): () => void {
    const listeners = this.depthListeners.get(symbol) || [];
    listeners.push(listener);
    this.depthListeners.set(symbol, listeners);

    // 返回取消订阅函数
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx > -1) {
        listeners.splice(idx, 1);
      }
    };
  }

  /**
   * 订阅成交数据
   */
  subscribeToTrade(symbol: string, listener: DataListener<Trade>): () => void {
    const listeners = this.tradeListeners.get(symbol) || [];
    listeners.push(listener);
    this.tradeListeners.set(symbol, listeners);

    return () => {
      const idx = listeners.indexOf(listener);
      if (idx > -1) {
        listeners.splice(idx, 1);
      }
    };
  }

  /**
   * 订阅连接状态变化
   */
  onConnectionChange(listener: DataListener<boolean>): () => void {
    this.connectionListeners.push(listener);

    return () => {
      const idx = this.connectionListeners.indexOf(listener);
      if (idx > -1) {
        this.connectionListeners.splice(idx, 1);
      }
    };
  }

  /**
   * 获取24小时价格变动统计
   */
  async get24hTicker(symbol: string): Promise<number> {
    if (this.config.isTestMode) {
      return 1000000; // Mock volume
    }

    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch ticker for ${symbol}`);
      }

      const data = await response.json();
      return parseFloat(data.quoteVolume); // 使用成交额 (USDT volume)
    } catch (error) {
      console.error(`[Binance] Failed to fetch 24h ticker for ${symbol}:`, error);
      return 0;
    }
  }

  /**
   * 获取深度快照 (REST API)
   */
  async getDepthSnapshot(symbol: string): Promise<any> {
    if (this.config.isTestMode) {
      return null;
    }

    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=5`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch depth snapshot for ${symbol}`);
      }

      const data: BinanceDepthSnapshot = await response.json();
      
      // 转换为标准格式
      return {
        symbol: this.binanceSymbolToStandard(symbol),
        exchange: Exchange.BINANCE,
        timestamp: Date.now(),
        lastUpdateId: data.lastUpdateId,
        bids: data.bids.map(([p, q]) => ({ price: parseFloat(p), quantity: parseFloat(q) })),
        asks: data.asks.map(([p, q]) => ({ price: parseFloat(p), quantity: parseFloat(q) })),
      };
    } catch (error) {
      console.error(`[Binance] Failed to fetch depth snapshot for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * 断线重连机制
   */
  private reconnect(): void {
    if (this.config.isTestMode) {
      return;
    }

    if (this.reconnectCount >= this.config.reconnectAttempts) {
      console.error('[Binance] Max reconnect attempts reached');
      this.emitConnectionStatus(false);
      return;
    }

    this.reconnectCount++;
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectCount - 1);

    console.log(`[Binance] Reconnecting in ${delay}ms (attempt ${this.reconnectCount})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('[Binance] Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.emitConnectionStatus(false);
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 转换Binance币对格式为标准格式
   * BTCUSDT -> BTC/USDT
   */
  private binanceSymbolToStandard(binanceSymbol: string): string {
    // 简单的启发式：如果以USDT结尾，插入/
    if (binanceSymbol.endsWith('USDT')) {
      return binanceSymbol.slice(0, -4) + '/USDT';
    }
    if (binanceSymbol.endsWith('BUSD')) {
      return binanceSymbol.slice(0, -4) + '/BUSD';
    }
    if (binanceSymbol.endsWith('USD')) {
      return binanceSymbol.slice(0, -3) + '/USD';
    }
    // 默认返回原始值
    return binanceSymbol;
  }

  /**
   * 发送连接状态给所有监听器
   */
  private emitConnectionStatus(connected: boolean): void {
    this.connectionListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (error) {
        console.error('[Binance] Error in connection listener:', error);
      }
    });
  }
}
