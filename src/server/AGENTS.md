# SERVER MODULE KNOWLEDGE

**Purpose:** Core business logic for cryptocurrency market anomaly detection

## OVERVIEW
Client-side market data processing engine with WebSocket integration, order book management, and 3-dimensional anomaly detection. Runs entirely in browser (not a Node.js backend).

## STRUCTURE
```
server/
├── binance.ts      # Binance WebSocket adapter (649 lines)
├── processor.ts     # Market data processor (385 lines)
├── detector.ts      # 3-dimension anomaly detector (293 lines)
├── orderbook.ts     # Order book with Map-based O(1) lookup (360 lines)
├── manager.ts       # Data source manager (263 lines)
├── types.ts        # Pure type definitions (261 lines)
├── config.ts       # Detection thresholds per trading pair
├── index.ts        # Clean public API exports
└── __tests__/      # 11 test files (Bun Test + ts-node)
```

## WHERE TO LOOK
| Task | File | Notes |
|------|------|-------|
| **WebSocket connection** | binance.ts | Exponential backoff, sequence validation |
| **Order book logic** | orderbook.ts | Map-based, auto-pruning, depth validation |
| **Detection algorithms** | detector.ts | Large trade (40%) + imbalance (35%) + slippage (25%) |
| **Multi-pair processing** | processor.ts | Pool manager, event distribution |
| **Type system** | types.ts | Pure definitions, imported by all modules |
| **Factory pattern** | manager.ts | `createMarketDataManager()` function |

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

**Type Safety Issues**:
```typescript
// ⚠️ Uses 'any' types extensively
onAlert(listener: (alert: any) => void): () => void

// TODO: Migrate to strict typing
onAlert(listener: (alert: MarketTakerAlert) => void): () => void
```

## ANTI-PATTERNS (THIS MODULE)

**❌ DON'T**:
- Modify OrderBook directly (use methods)
- Subscribe without cleanup (store unsubscribe function)
- Ignore sequence numbers (leads to data corruption)
- Throw exceptions from listeners (use console.error)
- Use 'any' types (migrate to explicit typing)

**✅ DO**:
- Use Map for O(1) price/quantity lookup
- Validate all depth updates before applying
- Buffer events before processing
- Clean up subscriptions in useEffect return
- Follow observable pattern with unsubscribe function

**Test Patterns**:
```typescript
// Server tests use custom static classes + console.assert
export class BinanceWSClientTests {
  static async runAllTests(): Promise<void> {
    console.assert(condition, 'Test failed');
  }
}

// Run via: node --loader ts-node/esm src/server/__tests__/binance.test.ts
```
