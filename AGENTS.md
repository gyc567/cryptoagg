# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-14 21:19:00
**Commit:** 4cb2e9c
**Branch:** main

## OVERVIEW
Real-time cryptocurrency market anomaly detection system with WebSocket-based monitoring from Binance exchange. React + Vite + TypeScript frontend running market data processing entirely client-side.

## STRUCTURE
```
.
├── src/
│   ├── components/    # React components
│   │   ├── ui/      # shadcn/ui base components (52)
│   │   └── feeds/   # 9 data source feeds
│   ├── hooks/        # Custom React Hooks (7)
│   ├── pages/        # Route pages
│   ├── server/       # Core business logic (market data processing)
│   ├── services/     # External API wrappers
│   └── lib/         # Utilities
├── public/          # Static assets
└── docs/            # (TO BE CREATED - move scattered markdown here)
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Market monitoring** | `src/server/processor.ts` | Core market data processing |
| **Anomaly detection** | `src/server/detector.ts` | 3-dimension detection algorithms |
| **OrderBook management** | `src/server/orderbook.ts` | Map-based order book with O(1) lookup |
| **Binance WebSocket** | `src/server/binance.ts` | Exchange adapter (609 lines) |
| **Type definitions** | `src/server/types.ts` | Pure type definitions (180 lines) |
| **React state layer** | `src/hooks/useMarketDataMonitor.ts` | Bridge between server and UI |
| **Feed components** | `src/components/feeds/` | 9 data source components |
| **Testing** | `src/**/__tests__/` | Bun Test + ts-node patterns |

## CODE MAP
**Core Types** (src/server/types.ts):
- `MarketTakerAlert` (alert structure)
- `OrderBookSnapshot`, `DepthUpdate`, `Trade` (market data)
- `Exchange`, `OrderSide`, `DetectionType` (enums)
- `LargeTransfer` (on-chain transfers)

**Key Classes**:
- `OrderBook` → orderbook.ts (360 lines)
- `MarketTakerDetector` → detector.ts (293 lines)
- `MarketDataProcessor` → processor.ts (384 lines)
- `BinanceWSClient` → binance.ts (609 lines)

**Key Functions**:
- `createMarketDataManager()` → manager.ts (factory)
- `useMarketDataMonitor()` → hooks/useMarketDataMonitor.ts (254 lines)
- `subscribeToDepth()`, `subscribeToTrade()` → binance.ts

## CONVENTIONS

**Architecture**:
- **Mixed architecture**: Client-side React app with embedded server logic (no Node.js backend)
- **Layered**: Data source → Adapter → Processor → Detector → Alert → UI
- **Event-driven**: Observable pattern with `subscribe(observer)` returning unsubscribe function

**TypeScript**:
- ⚠️ **Strict mode disabled** (tsconfig.json: `"strict": false`)
- ⚠️ Type checks relaxed for rapid development
- Path alias: `@/*` → `./src/*`

**React Hooks**:
- All hooks return: `{ data, status, isLoading, error }`
- `useRef` for mutable state (no re-render)
- `useEffect` cleanup for WebSocket disconnection
- Batch processing (500ms buffer) to reduce re-renders

**WebSocket Management**:
- Exponential backoff reconnection: 1s, 2s, 4s, 8s, 16s, 30s (max)
- Sequence number validation (Binance U/u mechanism)
- Listener isolation: errors in one listener don't affect others

## ANTI-PATTERNS (THIS PROJECT)

**Type Safety Issues**:
```typescript
// ❌ DO NOT: Implicit any types
function processData(data: any) { ... }

// ✅ DO: Explicit typing
function processData(data: MarketTakerAlert) { ... }
```

**ESLint Relaxed**:
```javascript
// ⚠️ Current: Unused vars ignored
"@typescript-eslint/no-unused-vars": "off"

// TODO: Gradual migration to strict mode
```

**Client-side Architecture**:
- ⚠️ All WebSocket connections managed by browser (no server relay)
- ⚠️ API keys may be exposed in client code
- Consider Node.js backend for production deployment

## UNIQUE STYLES

**OrderBook Implementation**:
- Uses `Map<number, number>` for O(1) price/quantity lookup
- Automatic pruning: deletes extreme depths to prevent memory leaks
- Sequence number validation prevents data corruption

**Detection Algorithm**:
- 3-dimension scoring: Large Trade (40%) + OrderBook Imbalance (35%) + Slippage (25%)
- Dynamic thresholds per trading pair (BTC: 50, ETH: 2000, SOL: 10000)
- Confidence boost when multiple dimensions agree

**Mock Data Pattern**:
```typescript
// All feeds use mock data arrays
const mockData = [
  { id: 1, source: "BlockBeats", title: "...", time: "3分钟前" },
  // ...
];
```
- Only `OnChainTransferFeed` uses real WebSocket data

**Test Dual System**:
- React tests: Bun Test + Happy-DOM + Testing Library
- Server tests: Custom static classes + `console.assert` (via ts-node)

## COMMANDS
```bash
# Development
bun install          # Install dependencies
bun run dev         # Start dev server (http://localhost:5173)

# Building
bun run build       # Production build
bun run preview     # Preview build

# Testing
bun test                       # React tests (Bun Test)
npm run test:market             # Server integration tests
npm run test:market:unit        # Server unit tests
npm run test:market:integration  # Server integration tests

# Linting
bun run lint        # ESLint check
```

## NOTES

**Architecture Philosophy** (Linus-style "Good Taste"):
- ✅ Eliminates edge cases via unified data structures
- ✅ Defensive programming: validation at every layer
- ✅ Observer pattern decouples data sources from consumers
- ✅ Single responsibility: each module has clear purpose

**Performance Optimizations**:
- Batch processing: 500ms buffers in `useLargeTransfers`
- Throttling: 500ms update cap in `useBinanceTicker`
- Deduplication: `Map`-based dedup for transfers
- Ref-based state: avoids unnecessary React re-renders

**Critical File Dependencies**:
- `src/server/types.ts` is imported by ALL server modules
- `src/server/index.ts` provides clean public API
- All feeds depend on `src/components/ui/DataCard`

**Known Issues**:
1. TypeScript strict mode disabled (technical debt)
2. No E2E tests (only unit/integration)
3. Documentation scattered in root (11 .md files)
4. Template artifact: README.md contains "REPLACE_WITH_PROJECT_ID"
