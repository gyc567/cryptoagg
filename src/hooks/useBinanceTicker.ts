import { useState, useEffect, useRef, useCallback } from 'react';

export interface TickerData {
  symbol: string;
  price: number;
  changePercent: number; // 24h change percent
  volume?: string; // 24h volume
}

interface BinanceTradePayload {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  p: string; // Price
  q: string; // Quantity
  t: number; // Trade ID
}

interface Binance24hTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string; // Volume in quote currency (e.g. USDT)
}

type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export function useBinanceTicker(symbols: string[]) {
  const [tickers, setTickers] = useState<Record<string, TickerData>>({});
  const [status, setStatus] = useState<ConnectionStatus>('DISCONNECTED');
  
  // Refs to hold state without triggering re-renders inside callbacks
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tickersRef = useRef<Record<string, TickerData>>({});
  const lastUpdateRef = useRef<number>(0);
  const pendingUpdateRef = useRef<boolean>(false);
  
  // Initial Snapshot Data (Open Prices for Change % Calculation)
  // Since @trade doesn't give 24h change, we assume the change% from REST API 
  // and roughly update it based on new price vs initial "prevClose" or keep it static relative to open?
  // Better: Store "openPrice" derived from REST (current / (1 + change%/100))
  // Then Realtime Change% = (CurrentPrice - OpenPrice) / OpenPrice
  const openPricesRef = useRef<Record<string, number>>({});

  // 1. Fetch Initial 24h Stats
  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        // Fetch data for all requested symbols
        // Binance REST API supports no symbol param for ALL, or we fetch individually?
        // optimization: Fetch all tickers once (lightweight enough) or loop? 
        // /api/v3/ticker/24hr returns ALL if no symbol provided. Size is ~300KB.
        // Or we can fetch individually in parallel.
        const promises = symbols.map(s => 
          fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${s.replace('/', '').toUpperCase()}`)
            .then(res => res.json())
        );
        
        const results = await Promise.all(promises);
        
        const initialTickers: Record<string, TickerData> = {};
        
        results.forEach((data: Binance24hTicker, index) => {
          const symbol = symbols[index]; // Map back to our format 'BTC/USDT'
          const price = parseFloat(data.lastPrice);
          const changePercent = parseFloat(data.priceChangePercent);
          
          // Calculate Open Price
          const openPrice = price / (1 + changePercent / 100);
          openPricesRef.current[symbol] = openPrice;
          
          initialTickers[symbol] = {
            symbol,
            price,
            changePercent,
            volume: formatVolume(parseFloat(data.quoteVolume))
          };
        });
        
        tickersRef.current = initialTickers;
        setTickers(initialTickers);
      } catch (e) {
        console.error("Failed to fetch initial ticker snapshot", e);
      }
    };

    fetchSnapshot();
  }, [JSON.stringify(symbols)]); // Deep compare for dependency

  // 2. WebSocket Connection
  useEffect(() => {
    let isMounted = true;
    
    const connect = () => {
      setStatus('CONNECTING');
      
      // Construct stream names: btcusdt@trade
      const streams = symbols.map(s => `${s.replace('/', '').toLowerCase()}@trade`).join('/');
      const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setStatus('CONNECTED');
        console.log('[BinanceTicker] WS Connected');
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setStatus('DISCONNECTED');
        console.log('[BinanceTicker] WS Closed, reconnecting in 2s...');
        reconnectTimeoutRef.current = setTimeout(connect, 2000);
      };

      ws.onerror = (err) => {
        if (!isMounted) return;
        console.error('[BinanceTicker] WS Error', err);
        setStatus('ERROR');
        ws.close(); // Trigger onclose to reconnect
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const message = JSON.parse(event.data);
          // Format: { stream: 'btcusdt@trade', data: { ... } }
          const trade: BinanceTradePayload = message.data;
          if (!trade) return;

          handleTradeUpdate(trade);
        } catch (e) {
          console.error('Parse Error', e);
        }
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
    };
  }, [JSON.stringify(symbols)]);

  // 3. Handle Updates & Throttling
  const handleTradeUpdate = useCallback((trade: BinanceTradePayload) => {
    // Map binance symbol 'BTCUSDT' back to 'BTC/USDT'
    // This is tricky if we don't know the exact mapping. 
    // We can assume symbols array order or search.
    // Efficient way: create a map at start. For now, simple find.
    const symbolKey = symbols.find(s => s.replace('/', '').toUpperCase() === trade.s);
    if (!symbolKey) return;

    const currentPrice = parseFloat(trade.p);
    const openPrice = openPricesRef.current[symbolKey];
    
    // Calculate new change % if we have open price
    let changePercent = 0;
    if (openPrice) {
      changePercent = ((currentPrice - openPrice) / openPrice) * 100;
    }

    tickersRef.current = {
      ...tickersRef.current,
      [symbolKey]: {
        ...tickersRef.current[symbolKey],
        symbol: symbolKey,
        price: currentPrice,
        changePercent: changePercent || tickersRef.current[symbolKey]?.changePercent || 0,
        // Keep existing volume as @trade doesn't have 24h volume
        volume: tickersRef.current[symbolKey]?.volume
      }
    };

    // Throttle state updates to 500ms (User said "update < 1s", so 200ms-500ms is good)
    const now = Date.now();
    if (now - lastUpdateRef.current > 500) {
      setTickers({ ...tickersRef.current });
      lastUpdateRef.current = now;
      pendingUpdateRef.current = false;
    } else {
      if (!pendingUpdateRef.current) {
        pendingUpdateRef.current = true;
        setTimeout(() => {
           setTickers({ ...tickersRef.current });
           lastUpdateRef.current = Date.now();
           pendingUpdateRef.current = false;
        }, 500);
      }
    }
  }, [symbols]);

  return { tickers, status };
}

function formatVolume(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
  return `$${val.toFixed(2)}`;
}
