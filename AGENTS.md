# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-16 21:55:00
**Commit:** main
**Branch:** main

## OVERVIEW
Real-time cryptocurrency market anomaly detection system with WebSocket-based monitoring from Binance exchange. React + Vite + TypeScript frontend running market data processing entirely client-side, plus Express backend for AI analysis.

## STRUCTURE
```
.
├── src/
│   ├── components/    # React components
│   │   ├── ui/      # shadcn/ui base components (52 files, 4038 lines)
│   │   ├── feeds/   # 9 data source feeds (913 lines)
│   │   └── trading-analysis/ # Trading analysis components
│   ├── hooks/        # Custom React Hooks (13 files, 1468 lines)
│   ├── pages/        # Route pages (5 files, 570 lines)
│   ├── server/       # Core business logic (market data processing)
│   │   ├── __tests__/ # 11 test files
│   │   ├── binance.ts      # WebSocket adapter (649 lines)
│   │   ├── processor.ts     # Data processor (385 lines)
│   │   ├── detector.ts      # Anomaly detector (293 lines)
│   │   ├── orderbook.ts     # Order book (360 lines)
│   │   ├── manager.ts       # Data source manager (263 lines)
│   │   └── types.ts        # Type definitions (261 lines)
│   ├── services/     # External API wrappers (4 files, 317 lines)
│   └── lib/         # Utilities
├── server/          # Express backend (Port 3001)
│   ├── routes/       # API routes
│   ├── services/     # AI analysis, image processing
│   └── index.ts     # Server entry
├── public/          # Static assets
└── docs/            # (TO BE CREATED - move scattered markdown here)
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Market monitoring** | `src/server/processor.ts` | Core market data processing |
| **Anomaly detection** | `src/server/detector.ts` | 3-dimension detection algorithms |
| **OrderBook management** | `src/server/orderbook.ts` | Map-based order book with O(1) lookup |
| **Binance WebSocket** | `src/server/binance.ts` | Exchange adapter (649 lines) |
| **Type definitions** | `src/server/types.ts` | Pure type definitions (261 lines) |
| **React state layer** | `src/hooks/useMarketDataMonitor.ts` | Bridge between server and UI |
| **Feed components** | `src/components/feeds/` | 9 data source components |
| **UI components** | `src/components/ui/` | 52 shadcn/ui components |
| **Testing** | `src/**/__tests__/` | Bun Test + ts-node patterns |
| **Express backend** | `server/index.ts` | AI analysis, upload handling |

## CODE MAP
**Core Types** (src/server/types.ts):
- `MarketTakerAlert` (alert structure)
- `OrderBookSnapshot`, `DepthUpdate`, `Trade` (market data)
- `Exchange`, `OrderSide`, `DetectionType` (enums)
- `LargeTransfer` (on-chain transfers)

**Key Classes**:
- `OrderBook` → orderbook.ts (360 lines, Map-based O(1) lookup)
- `MarketTakerDetector` → detector.ts (293 lines, 3-dimension scoring)
- `MarketDataProcessor` → processor.ts (385 lines, event processing)
- `BinanceWSClient` → binance.ts (649 lines, WebSocket adapter)
- `MarketDataManager` → manager.ts (263 lines, factory)

**Key Functions**:
- `createMarketDataManager()` → manager.ts (factory function)
- `useMarketDataMonitor()` → hooks/useMarketDataMonitor.ts (main hook)
- `subscribeToDepth()`, `subscribeToTrade()` → binance.ts (WebSocket subscriptions)

## CONVENTIONS

**Architecture**:
- **Mixed architecture**: Dual-server system
  - `src/server/` = Client-side market data processing (runs in browser)
  - `server/` = Express backend for AI analysis (Port 3001)
- **Layered**: Data source → Adapter → Processor → Detector → Alert → UI
- **Event-driven**: Observable pattern with `subscribe(observer)` returning unsubscribe function

**TypeScript**:
- ⚠️ **Strict mode disabled** (tsconfig.json: `"strict": false`)
- ⚠️ All checks relaxed: `noImplicitAny: false`, `strictNullChecks: false`
- ⚠️ 33+ `any` types used throughout codebase
- Path alias: `@/*` → `./src/*`

**React Hooks**:
- All hooks return: `{ data, status, isLoading, error }`
- `useRef` for mutable state (no re-render)
- `useEffect` cleanup for WebSocket disconnection
- Batch processing (500ms buffer) to reduce re-renders
- Throttling (500ms cap) for ticker updates

**WebSocket Management**:
- Exponential backoff reconnection: 1s, 2s, 4s, 8s, 16s, 30s (max)
- Sequence number validation (Binance U/u mechanism)
- Listener isolation: errors in one listener don't affect others
- All WebSocket connections managed directly by browser (no server relay)

**Data Structures**:
- Heavy use of `Map<K, V>` and `Set<T>` for O(1) lookups
- OrderBook uses `Map<number, number>` (price → quantity)
- Subscriber management uses `Set` for automatic deduplication

**Error Handling**:
- No empty catch blocks found ✅
- All errors logged via `console.error`
- Try-catch wraps listener callbacks for isolation

## ANTI-PATTERNS (THIS PROJECT)

**Type Safety Issues**:
```typescript
// ❌ DO NOT: Implicit any types (33+ occurrences)
function processData(data: any) { ... }
onAlert(listener: (alert: any) => void)

// ✅ DO: Explicit typing
function processData(data: MarketTakerAlert) { ... }
```

**Test Anti-patterns**:
```typescript
// ❌ DO NOT: Use @ts-ignore to access private methods
// @ts-ignore
instance.privateMethod()

// ✅ DO: Provide test-friendly public interfaces
instance.publicTestHelper()
```

**ESLint Relaxed**:
```javascript
// ⚠️ Current: Unused vars ignored
"@typescript-eslint/no-unused-vars": "off"

// TODO: Gradual migration to strict mode
```

**Git Hygiene**:
- ⚠️ `test-results/` and `uploads/` tracked by Git (should be in .gitignore)
- ⚠️ Runtime artifacts committed to version control

**Architecture Concerns**:
- ⚠️ API keys may be exposed in client code
- ⚠️ Detection algorithms visible in browser bundle
- ⚠️ No CI/CD pipeline configured
- ⚠️ Mixed test frameworks (Bun Test + custom static classes)

## UNIQUE STYLES

**OrderBook Implementation**:
- Uses `Map<number, number>` for O(1) price/quantity lookup
- Automatic pruning: deletes extreme depths to prevent memory leaks
- Sequence number validation prevents data corruption
- Unified updates: `set()` operation handles both add and remove

**Detection Algorithm**:
- 3-dimension scoring: Large Trade (40%) + OrderBook Imbalance (35%) + Slippage (25%)
- Dynamic thresholds per trading pair (BTC: 50, ETH: 2000, SOL: 10000)
- Confidence boost when multiple dimensions agree

**Observable Pattern**:
```typescript
// All subscribers return unsubscribe function
subscribe(observer: (value: T) => void): () => void {
  this.listeners.push(listener);
  return () => {
    this.listeners = this.listeners.filter((l) => l !== listener);
  };
}
```

**Mock Data Pattern**:
```typescript
// All feeds (except OnChainTransferFeed) use mock data
const mockData = [
  { id: 1, source: "BlockBeats", title: "...", time: "3分钟前" },
  // ...
];
```

**Test Dual System**:
- React tests: Bun Test + Happy-DOM + Testing Library
- Server tests: Custom static classes + `console.assert` (via ts-node)
- No E2E tests (224 unit/integration tests only)

**Performance Optimizations**:
- Batch processing: 500ms buffers in `useLargeTransfers`
- Throttling: 500ms update cap in `useBinanceTicker`
- Deduplication: `Map`-based dedup for transfers
- Ref-based state: avoids unnecessary React re-renders

## COMMANDS
```bash
# Development
bun install          # Install dependencies
bun run dev         # Start dev server (http://localhost:8080)
bun run dev:server  # Start Express backend (http://localhost:3001)

# Building
bun run build       # Production build
bun run build:dev   # Development build
bun run preview     # Preview build

# Testing
bun test                       # React tests (Bun Test)
npm run test:market             # Server integration tests
npm run test:market:unit        # Server unit tests
npm run test:market:integration  # Server integration tests

# Linting
bun run lint        # ESLint check

## Browser Automation

Use `agent-browser` for web automation. Run `agent-browser --help` for all commands.

Core workflow:
1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes

## NOTES

**Architecture Philosophy** (Linus-style "Good Taste"):
- ✅ Eliminates edge cases via unified data structures (Map-based OrderBook)
- ✅ Defensive programming: validation at every layer
- ✅ Observer pattern decouples data sources from consumers
- ✅ Single responsibility: each module has clear purpose
- ⚠️ Type safety debt: strict mode disabled (violates "trust but verify")

**Critical File Dependencies**:
- `src/server/types.ts` is imported by ALL server modules
- `src/server/index.ts` provides clean public API
- All feeds depend on `src/components/ui/DataCard`
- All hooks use `useRef` + `useState` pattern for state management

**Project Stats**:
- Total files: 175 TypeScript/TSX files
- Total lines: ~13,624 lines of code
- Large files (>500 lines): 3 (binance.ts, orderbook.ts, processor.ts)
- Test files: 224 tests across 17 test files
- shadcn/ui components: 52 components

**Known Issues**:
1. 🔴 TypeScript strict mode disabled (technical debt, 33+ any types)
2. 🔴 No CI/CD pipeline configured
3. 🔴 Runtime directories tracked by Git (test-results/, uploads/)
4. 🟡 No E2E tests (only unit/integration)
5. 🟡 Documentation scattered in root (15 markdown files)
6. 🟡 Template artifact: README.md contains "REPLACE_WITH_PROJECT_ID"
7. 🟡 Dual test frameworks (Bun Test + custom static classes)
8. 🟠 7 `@ts-ignore` comments in test files
9. 🟠 377 console.* calls (should use structured logging)

**Next Steps (Priority Order)**:
1. Enable TypeScript strict mode (gradual migration)
2. Add `.gitignore` entries for runtime directories
3. Setup GitHub Actions CI/CD pipeline
4. Consolidate test frameworks to Bun Test
5. Move scattered docs to `docs/` directory
6. Add E2E tests with Playwright
