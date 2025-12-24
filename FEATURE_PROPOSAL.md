# Feature Proposal: Market Taker Alert Filtering

## 1. Objective
Refine the market taker alert system to filter trades based on specific quantity thresholds for major cryptocurrencies.
- **BTC**: Only alert for single trades >= 50 BTC.
- **ETH**: Only alert for single trades >= 2000 ETH.
- **Dimension**: Ensure trade direction (Buy/Sell) is clearly identified.

## 2. Design Principles (KISS & SOLID)
- **High Cohesion**: Configuration of thresholds remains in `config.ts`. Detection logic remains in `detector.ts`.
- **Low Coupling**: The detector does not hardcode values; it reads from the configuration.
- **Simplicity**: Utilize the existing `PairThreshold` structure. No new complex filtering classes are needed, just configuration updates.

## 3. Implementation Plan

### A. Configuration Update (`src/server/config.ts`)
- Update `BTC/USDT`, `BTC/BUSD`, `BTC/USD` thresholds to **50**.
- Update `ETH/USDT`, `ETH/BUSD`, `ETH/USD` thresholds to **2000** (previously 500).

### B. Logic Verification (`src/server/detector.ts`)
- Verify `detectLargeTrade` method uses `>=` logic (currently `quantity < threshold` returns null, effectively implementing `>=`).
- Ensure `side` (Buy/Sell) is passed from `Trade` object to `MarketTakerAlert`.

### C. Testing (`src/server/__tests__/filtering.test.ts`)
- **Test Case 1**: BTC boundary test (49 vs 50).
- **Test Case 2**: ETH boundary test (1999 vs 2000).
- **Test Case 3**: Verify Buy vs Sell direction in generated alerts.

## 4. Impact Analysis
- **Existing Functionality**: Other coins (SOL, XRP) remain unaffected.
- **Performance**: Zero overhead; simple numeric comparison.
- **Risk**: Low. Pure configuration change.

## 5. Future Extensibility
- If distinct thresholds for Buy vs Sell are required later, `PairThreshold` can be extended with `largeBuyQtyThreshold` and `largeSellQtyThreshold`. For now, a single `largeTradeQtyThreshold` suffices.
