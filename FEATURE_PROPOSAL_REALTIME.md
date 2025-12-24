# Feature Proposal: Real-Time Crypto Ticker

## 1. Objective
Implement real-time price monitoring for major cryptocurrencies (BTC, ETH) using Binance WebSocket API, replacing static mock data in the `StatsBar` component.

## 2. Technical Specifications

### A. Data Source
- **API**: Binance WebSocket API (Free)
- **Endpoint**: `wss://stream.binance.com:9443/ws`
- **Streams**: 
    - `<symbol>@trade` (for real-time price updates < 1s)
    - **Initial Snapshot**: Binance REST API `/api/v3/ticker/24hr` (to establish 24h Open Price for % change calculation)

### B. Implementation Details
- **Hook**: `useBinanceTicker(symbols: string[])`
    - Manages WebSocket connection.
    - Handles automatic reconnection with exponential backoff.
    - Implements data throttling (max 1 update per 100ms) to prevent React render thrashing.
    - Returns: `{ tickers: Record<string, TickerData>, connectionStatus }`.
    - `TickerData`: `{ symbol, price, changePercent, volume }`.
- **Component**: `StatsBar`
    - Updates to consume `useBinanceTicker`.
    - Retains existing visual style.
    - Shows "Connecting..." state.

### C. Error Handling & Rate Limiting
- **WebSocket Error**: Auto-reconnect after 1s, 2s, 5s...
- **Rate Limiting**: Throttling client-side state updates. API side limits are high enough for single connection.

### D. Testing
- **Unit Tests**: Test Hook logic (connection, data parsing, error handling) using mocks.

## 3. Design Principles (KISS)
- **Single Responsibility**: The hook handles data fetching/syncing. The component handles display.
- **No Heavy Libraries**: Native `WebSocket` API.

## 4. Impact
- **Performance**: Minimal CPU usage due to throttling.
- **UX**: Live flashing prices instead of static numbers.
