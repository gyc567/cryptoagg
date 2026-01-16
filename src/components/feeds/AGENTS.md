# FEEDS COMPONENT KNOWLEDGE

**Purpose:** Business components displaying real-time data from 9 different sources

## OVERVIEW
9 feed components providing unified visual interface to market alerts, transfers, news, and whale tracking with standardized layout and animations.

## STRUCTURE
```
feeds/
├── MarketOrderFeed.tsx      # Market taker alerts (REAL DATA)
├── OnChainTransferFeed.tsx  # Large transfers (REAL DATA)
├── AbnormalVolumeFeed.tsx   # Abnormal volume detection
├── EntityTransferFeed.tsx    # Institution transfers
├── WhaleFeed.tsx           # Whale tracking
├── NewsFeed.tsx            # Crypto news aggregator
├── TwitterFeed.tsx         # Social sentiment
├── MacroNewsFeed.tsx        # Macro economic news
└── SpecialChannelFeed.tsx    # Exclusive information
```

## WHERE TO LOOK
| Component | Data Source | Real/Mock |
|-----------|-------------|-----------|
| MarketOrderFeed | useMarketDataMonitor | **REAL** |
| OnChainTransferFeed | useLargeTransfers | **REAL** |
| Other 7 feeds | Static mock data arrays | MOCK |

## CONVENTIONS

**Unified Component Structure**:
```typescript
export function XXXFeed() {
  const { data, status, isLoading, error } = useXXX();
  return (
    <DataCard title="..." icon={<Icon />}>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div
            key={item.id}
            className="p-3 rounded bg-secondary/30 hover:bg-secondary/50 transition-colors animate-slide-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Content */}
          </div>
        ))}
      </div>
    </DataCard>
  );
}
```

**Mock Data Pattern**:
```typescript
const mockData = [
  { id: 1, source: "BlockBeats", title: "...", time: "3分钟前", urgent: true },
  { id: 2, source: "CoinDesk", title: "...", time: "15分钟前", urgent: false },
  // ...
];
```

**Common Mock Data Fields**:
- `id`: unique identifier
- `source`: data source name
- `title`/`content`: main content
- `time`: relative time string (Chinese: "3分钟前")
- `urgent`/`type`/`impact`: category badges

**Animation Cascade**:
```typescript
style={{ animationDelay: `${index * 50}ms` }}
// Creates staggered entrance: 0ms, 50ms, 100ms, 150ms...
```

**DataCard Dependency**:
- All feeds use `DataCard` from `@/components/ui/DataCard`
- Uses `Badge` from `@/components/ui/CustomBadge`
- Consistent styling: `p-3 rounded bg-secondary/30`

**Loading States**:
```typescript
if (isLoading) {
  return (
    <DataCard title="...">
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </DataCard>
  );
}
```

## ANTI-PATTERNS (THIS MODULE)

**❌ DON'T**:
- Duplicate component structure (extract to shared component if needed)
- Hardcode animation delays (use index * 50 pattern)
- Skip loading states (show skeleton)
- Use different styling (follow DataCard pattern)

**✅ DO**:
- Keep structure consistent across all feeds
- Use mock data arrays for development
- Stagger animations with `animationDelay`
- Implement skeleton loading states
- Follow existing color and spacing patterns
- Use `animate-slide-in` for entrance animations

**Test Patterns**:
```typescript
// Tests use Bun Test + Testing Library
import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import NewsFeed from "../NewsFeed";
```
