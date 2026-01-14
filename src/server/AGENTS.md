# SERVER MODULE KNOWLEDGE

**Purpose:** Core business logic for cryptocurrency market anomaly detection

## OVERVIEW
Client-side market data processing engine with WebSocket integration, order book management, and 3-dimensional anomaly detection.

## STRUCTURE
```
server/
├── binance.ts      # Binance WebSocket adapter (609 lines)
├── processor.ts     # Market data processor pool (384 lines)
├── detector.ts      # 3-dimension anomaly detector (293 lines)
├── orderbook.ts     # Order book with Map-based O(1) lookup (360 lines)
├── manager.ts       # Data source adapter + factory (263 lines)
├── types.ts        # Pure type definitions (180 lines)
├── config.ts       # Detection thresholds per trading pair (113 lines)
└── index.ts        # Clean public API exports
```

## WHERE TO LOOK
| Task | File | Notes |
|------|------|-------|
| **WebSocket connection** | binance.ts | Exponential backoff, sequence validation |
| **Order book logic** | orderbook.ts | Map-based, auto-pruning, depth validation |
| **Detection algorithms** | detector.ts | Large trade (40%) + imbalance (35%) + slippage (25%) |
| **Multi-pair processing** | processor.ts | Pool manager, event distribution |
| **Type system** | types.ts | Pure definitions, imported by all modules |

## CONVENTIONS

**Observable Pattern**:
```typescript
// All listeners return unsubscribe function
onAlert(listener: AlertListener): () => void {
  this.alertListeners.push(listener);
  return () => {
    this.alertListeners = this.alertListeners.filter((l) => l !== listener);
  };
}
```

**Error Isolation**:
- Listeners wrapped in try-catch
- Errors in one listener don't crash others
- Console.error for logging, never throw

**Sequence Validation** (Binance specific):
- REST snapshot first (depth snapshot)
- WS incremental updates (depth update)
- Validate: `U <= lastUpdateId + 1 AND u >= lastUpdateId + 1`
- Discard if `u <= lastUpdateId`

**Memory Safety**:
- OrderBook automatically prunes extreme depths
- Max depth limit prevents unbounded growth
- Map cleanup when size exceeds threshold

## ANTI-PATTERNS (THIS MODULE)

**❌ DON'T**:
- Modify OrderBook directly (use methods)
- Subscribe without cleanup (store unsubscribe function)
- Ignore sequence numbers (leads to data corruption)
- Throw exceptions from listeners (use console.error)

**✅ DO**:
- Use Map for O(1) price/quantity lookup
- Validate all depth updates before applying
- Buffer events before processing
- Clean up subscriptions in useEffect return
