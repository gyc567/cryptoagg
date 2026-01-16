# HOOKS MODULE KNOWLEDGE

**Purpose:** React Custom Hooks bridging server logic to UI components

## OVERVIEW
7 custom hooks providing reactive interfaces to market data, WebSocket connections, and external APIs with standardized state management.

## STRUCTURE
```
hooks/
├── useMarketDataMonitor.ts  # Main monitoring hook (254 lines)
├── useBinanceTicker.ts      # Binance WebSocket ticker (209 lines)
├── useLargeTransfers.ts     # Large transfer monitor (187 lines)
├── useGlobalStats.ts        # Global market stats (139 lines)
├── useFearGreedIndex.ts   # Fear & Greed index (simple fetch)
├── use-mobile.tsx          # Mobile viewport detection
├── use-toast.ts           # Toast notifications
└── __tests__/            # 6 test files
```

## WHERE TO LOOK
| Task | File | Notes |
|------|------|-------|
| **Real-time alerts** | useMarketDataMonitor.ts | Bridge to MarketDataProcessorPool |
| **Binance ticker data** | useBinanceTicker.ts | WebSocket with 500ms throttling |
| **Large transfers** | useLargeTransfers.ts | WebSocket + 500ms batch buffer |
| **External API** | useGlobalStats.ts, useFearGreedIndex.ts | REST API fetch with error handling |

## CONVENTIONS

**Standard Return Interface**:
```typescript
// All hooks return this shape
return {
  data: T[],           // Primary data array
  status: ConnectionStatus,  // 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'
  isLoading: boolean,   // Loading state
  error: Error | null  // Error object
};
```

**Ref-Based State** (no re-render):
```typescript
const tickersRef = useRef<Record<string, TickerData>>({});
// Directly modify ref (doesn't trigger re-render)
tickersRef.current[symbol] = newData;
// Only trigger re-render when needed
setTickers({ ...tickersRef.current });
```

**WebSocket Cleanup**:
```typescript
useEffect(() => {
  const ws = connect();
  return () => {
    ws.close();  // Always disconnect on unmount
  };
}, []);
```

**Batch Processing** (500ms pattern):
```typescript
if (!flushTimerRef.current) {
  flushTimerRef.current = setTimeout(() => {
    setTransfers(bufferRef.current.slice(0, maxItems));
    bufferRef.current = [];
    flushTimerRef.current = null;
  }, 500);
}
```

**Throttling** (500ms cap):
```typescript
const now = Date.now();
if (now - lastUpdateRef.current > 500) {
  setTickers({ ...tickersRef.current });
  lastUpdateRef.current = now;
} else {
  // Debounce the next update
  setTimeout(() => setTickers({ ...tickersRef.current }), 500);
}
```

**Reconnection** (exponential backoff):
```typescript
const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
reconnectAttempts++;
setTimeout(connect, delay);  // 1s, 2s, 4s, 8s, 16s, 30s max
```

**Deduplication**:
```typescript
// Use Map for O(1) deduplication
const dedupMap = new Map(transfer.id);
```

## ANTI-PATTERNS (THIS MODULE)

**❌ DON'T**:
- Forget cleanup in useEffect return
- Use useState for frequently updated data (useRef instead)
- Skip error boundaries on fetch calls
- Expose raw WebSocket connections to components

**✅ DO**:
- Return consistent interface `{ data, status, isLoading, error }`
- Use refs for mutable state that doesn't need re-render
- Implement exponential backoff for reconnection
- Batch updates to reduce React re-renders
- Deduplicate data using Map before setting state

**Test Patterns**:
```typescript
// Tests use Bun Test + Happy-DOM + Testing Library
import { describe, it, expect } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";

// Run via: bun test --preload ./src/test/setup.ts
```
