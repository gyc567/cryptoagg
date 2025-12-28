# Feature Proposal: Real-time Crypto News Aggregator

## 1. Overview
Implement a real-time crypto news aggregator that fetches and displays the latest news from multiple high-authority sources including BlockBeats, CoinDesk, The Block, CoinTelegraph, CryptoSlate, and SoSoValue.

## 2. Goals
- Provide real-time news updates to users.
- Support multiple news sources with distinct branding (colors/labels).
- Implement a robust service-layer for news fetching and aggregation.
- Ensure 100% test coverage for the new logic.
- Maintain high performance and clean architecture.

## 3. Technical Design

### 3.1 Data Model
```typescript
export interface CryptoNewsItem {
  id: string;
  source: string;
  title: string;
  content?: string;
  timestamp: number;
  importance: 'normal' | 'high';
  url?: string;
}
```

### 3.2 Service Layer (`src/services/news.ts`)
A singleton service responsible for:
- Fetching news from various sources (simulated real-time via polling/mock for now, designed for real API integration).
- Normalizing data into a unified `CryptoNewsItem` format.
- Managing an internal cache of recent news.

### 3.3 Hook Layer (`src/hooks/useCryptoNews.ts`)
A custom hook that:
- Connects to the News Service.
- Provides a reactive stream of news items to components.
- Handles loading and error states.

### 3.4 UI Layer (`src/components/feeds/NewsFeed.tsx`)
Update the existing `NewsFeed` component to:
- Use the `useCryptoNews` hook instead of mock data.
- Support real-time animations for new items.
- Display source-specific badges and importance indicators.

## 4. Implementation Plan
1. Define `CryptoNewsItem` in `src/server/types.ts`.
2. Implement `NewsService` in `src/services/news.ts`.
3. Create `useCryptoNews` hook.
4. Update `NewsFeed` component.
5. Add unit tests for Service, Hook, and Component.

## 5. KISS and Clean Code
- **KISS:** Use simple polling mechanism for "real-time" if a WebSocket is not available.
- **Cohesion:** All news-related logic encapsulated in the News Service.
- **Coupling:** UI components depend on the hook, not the service implementation.
- **Patterns:** Observer pattern for news updates.
