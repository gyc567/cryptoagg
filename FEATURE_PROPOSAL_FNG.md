# Feature Proposal: Real-Time Fear & Greed Index

## 1. Objective
Implement real-time fetching and display of the "Crypto Fear & Greed Index" using the free Alternative.me API.

## 2. Technical Specifications

### A. Data Source
- **API**: Alternative.me FNG API
- **Endpoint**: `https://api.alternative.me/fng/?limit=1`
- **Method**: GET
- **Response Format**: JSON

### B. Architecture (Modular & Low Coupling)
1.  **Service Layer** (`src/services/fng.ts`):
    - Encapsulates the API call.
    - Types: `FngData`, `FngResponse`.
    - Function: `fetchFearAndGreedIndex()`.
    - Handles network errors and parsing.

2.  **State Management (Hook)** (`src/hooks/useFearGreedIndex.ts`):
    - Uses `fng` service.
    - Manages `data`, `loading`, `error` state.
    - Fetches on mount (since data updates daily).

3.  **UI Component** (`src/components/FearGreedLabel.tsx`):
    - Specialized component to render the index.
    - Displays: "Value" (e.g., 75) and "Classification" (e.g., Greed).
    - Styling: Color-coded based on value (Red for Extreme Fear, Green for Extreme Greed).

4.  **Integration**:
    - Updates `StatsBar.tsx` to include `FearGreedLabel`.

### C. Testing
- **Unit Tests**: Mock `fetch` to test service and hook.
- **Integration**: Verify component renders correct data from hook.

## 3. Design Principles
- **KISS**: Simple fetch-and-display flow.
- **Separation of Concerns**: Service handles API, Hook handles State, Component handles UI.
