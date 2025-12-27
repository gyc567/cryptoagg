import { useState, useEffect, useRef, useCallback } from 'react';
import { LargeTransfer } from '@/server/types';

interface UseLargeTransfersOptions {
  threshold?: number; // USD value threshold, default 100,000
  symbols?: string[]; // e.g. ['BTCUSDT', 'ETHUSDT']
  maxItems?: number; // Max items to keep in history
}

interface BinanceAggTrade {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  a: number; // Aggregate trade ID
  p: string; // Price
  q: string; // Quantity
  f: number; // First trade ID
  l: number; // Last trade ID
  T: number; // Trade time
  m: boolean; // Is buyer the market maker?
  M: boolean; // Ignore
}

const DEFAULT_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];
const DEFAULT_THRESHOLD = 10000000; // $10M
const MAX_ITEMS = 50;

export function useLargeTransfers({
  threshold = DEFAULT_THRESHOLD,
  symbols = DEFAULT_SYMBOLS,
  maxItems = MAX_ITEMS
}: UseLargeTransfersOptions = {}) {
  const [transfers, setTransfers] = useState<LargeTransfer[]>([]);
  const [status, setStatus] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'>('DISCONNECTED');
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bufferRef = useRef<LargeTransfer[]>([]);
  const lastFlushRef = useRef<number>(0);
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formatValue = (val: number): string => {
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
  };

  const processTrade = useCallback((trade: BinanceAggTrade) => {
    const price = parseFloat(trade.p);
    const quantity = parseFloat(trade.q);
    const value = price * quantity;

    if (value < threshold) {
        return;
    }

    // Map fields
    // m = true: Buyer is Maker (Limit Order), Seller is Taker (Market Sell) -> "Sell" direction
    // m = false: Buyer is Taker (Market Buy), Seller is Maker (Limit Order) -> "Buy" direction
    const isSell = trade.m; 
    const direction = isSell ? 'out' : 'in';
    
    // Determine "Addresses" (Simulated)
    // If Sell: From "Whale/Trader" To "Market"
    // If Buy: From "Market" To "Whale/Trader"
    // To match the UI expectation of "From" -> "To"
    const fromAddress = isSell ? "Binance User" : "Binance Hot Wallet";
    const toAddress = isSell ? "Binance Hot Wallet" : "Binance User";

    const symbol = trade.s.replace('USDT', '');

    const transfer: LargeTransfer = {
      txId: `${trade.a}`,
      amount: quantity,
      currency: symbol,
      fromAddress,
      toAddress,
      timestamp: trade.T,
      exchange: 'Binance',
      value: formatValue(value),
      direction
    };

    bufferRef.current = [transfer, ...bufferRef.current].slice(0, maxItems);
    
    // Schedule flush if not scheduled
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(() => {
        const currentBuffer = [...bufferRef.current];
        if (currentBuffer.length === 0) {
            flushTimerRef.current = null;
            return;
        }

        setTransfers(prev => {
          // Merge buffer with previous state, keep maxItems
          const distinct = new Map();
          // Add new items first (they are newer)
          currentBuffer.forEach(item => distinct.set(item.txId, item));
          // Add old items
          prev.forEach(item => {
            if (!distinct.has(item.txId)) distinct.set(item.txId, item);
          });
          
          return Array.from(distinct.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, maxItems);
        });
        bufferRef.current = [];
        flushTimerRef.current = null;
      }, 500); // 500ms batching
    }
  }, [threshold, maxItems]);

  useEffect(() => {
    let isMounted = true;
    let reconnectAttempts = 0;
    const maxReconnects = 5;

    const connect = () => {
      if (reconnectAttempts > maxReconnects) {
        setStatus('ERROR');
        return;
      }

      setStatus('CONNECTING');
      
      const streamNames = symbols.map(s => `${s.toLowerCase()}@aggTrade`).join('/');
      const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streamNames}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setStatus('CONNECTED');
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const message = JSON.parse(event.data);
          // { stream: '...', data: { ... } }
          if (message.data && message.data.e === 'aggTrade') {
            processTrade(message.data);
          }
        } catch (e) {
          console.error("Parse error", e);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setStatus('DISCONNECTED');
        wsRef.current = null;
        
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectAttempts++;
        console.log(`Reconnecting in ${delay}ms...`);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = (e) => {
        console.error("WebSocket error", e);
        ws.close(); // Trigger onclose
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }
    };
  }, [JSON.stringify(symbols), processTrade]);

  return { transfers, status };
}
