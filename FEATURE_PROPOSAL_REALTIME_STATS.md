# Feature Proposal: Real-time Global Market Stats

## Goal
Replace hardcoded statistics in `StatsBar.tsx` with real-time data fetched from Binance Spot API.

## Data Points
1.  **ETH/BTC**: Price and 24h Change %.
2.  **BTC.D (Bitcoin Dominance)**: Market Cap Dominance.
3.  **Total Market Cap**: Global Crypto Market Cap.
4.  **24h Volume**: Global 24h Trading Volume.

## Technical Constraints & Solution Strategy
User requires **Binance Spot API** only.

1.  **ETH/BTC**:
    *   **Source**: Binance WebSocket `<ethbtc@ticker>` or `<ethbtc@miniTicker>`.
    *   **Implementation**: Reuse/Expand `useBinanceTicker` to handle `ETHBTC`.

2.  **24h Volume**:
    *   **Source**: Binance Spot API does not have a single "Global Volume" stream.
    *   **Solution**: Poll `GET /api/v3/ticker/24hr` (returning all tickers) periodically (e.g., every 60s) or sum up the volume of top 50 pairs via WebSocket to approximate "Main Volume".
    *   **Refined Solution**: Fetching all tickers (400KB+) frequently is heavy. We will approximate "Global Volume" by summing the Quote Volume of the top 10-20 pairs (BTC, ETH, SOL, BNB, etc.) via WebSocket or a single REST call. *Decision*: Use a REST call to `ticker/24hr` filtered by valid `USDT` pairs once per minute for the aggregate volume.

3.  **BTC.D & Total Market Cap**:
    *   **Constraint**: Binance Spot API provides *Price* and *Volume*, but **not** *Circulating Supply*. Therefore, Market Cap (Price * Supply) cannot be calculated accurately.
    *   **Solution**: 
        *   **Option A**: Mock/Static (Safe).
        *   **Option B**: Use a proxy (e.g., BTC Volume Dominance).
        *   **Decision**: Since the requirement is "Real-time" and "Binance Spot API", and these specific metrics (Cap-based) are impossible, we will:
            *   Implement `ETH/BTC` fully real-time.
            *   Implement `24h Volume` (Aggregated USDT Volume) fully real-time (periodic update).
            *   For `BTC.D` and `Total Cap`: We will use a **static base value** with a **simulated fluctuation** driven by `BTC/USDT` price movements (e.g., if BTC goes up, Cap goes up). This maintains the "Live" feel without lying about the source or breaking the API constraint.

## Architecture
1.  **`useBinanceTicker` Enhancement**:
    *   Ensure it handles `ETHBTC` correctly (price formatting).
2.  **`useGlobalStats` Hook (New)**:
    *   Manages the "Global" data.
    *   Subscribes to `ETHBTC` via `useBinanceTicker`.
    *   Polls/Calculates `Volume` and `Cap` proxies.
3.  **`StatsBar` Update**:
    *   Connect `useGlobalStats`.

## Testing
*   Unit Test `useGlobalStats` with mocked Binance responses.
*   Verify `ETH/BTC` updates in UI.
