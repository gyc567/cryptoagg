import { DataCard } from "@/components/ui/DataCard";
import { Badge } from "@/components/ui/CustomBadge";
import { Fish, ExternalLink, ArrowUpRight, ArrowDownRight } from "lucide-react";

const mockWhaleActivity = [
  { 
    id: 1, 
    source: "lookonchain", 
    wallet: "0x1234...5678", 
    action: "买入", 
    asset: "ETH", 
    amount: "15,000", 
    value: "$51.8M",
    platform: "Hyperliquid",
    time: "10分钟前"
  },
  { 
    id: 2, 
    source: "余烬", 
    wallet: "0xabcd...efgh", 
    action: "转移", 
    asset: "BTC", 
    amount: "500", 
    value: "$49.2M",
    platform: "链上",
    time: "25分钟前"
  },
  { 
    id: 3, 
    source: "WhaleAlert", 
    wallet: "Binance Cold", 
    action: "转出", 
    asset: "USDT", 
    amount: "100M", 
    value: "$100M",
    platform: "Binance",
    time: "1小时前"
  },
  { 
    id: 4, 
    source: "AI姨", 
    wallet: "0x9876...5432", 
    action: "开空", 
    asset: "BTC", 
    amount: "200", 
    value: "$19.7M",
    platform: "Hyperliquid",
    time: "2小时前"
  },
  { 
    id: 5, 
    source: "lookonchain", 
    wallet: "Smart Whale #3", 
    action: "加仓", 
    asset: "SOL", 
    amount: "250,000", 
    value: "$61.2M",
    platform: "链上",
    time: "3小时前"
  },
];

const sourceColors: Record<string, string> = {
  "lookonchain": "default",
  "余烬": "warning",
  "WhaleAlert": "success",
  "AI姨": "destructive",
};

export function WhaleFeed() {
  return (
    <DataCard 
      title="聪明巨鲸监控" 
      icon={<Fish className="w-4 h-4" />}
      maxHeight="500px"
    >
      <div className="space-y-2">
        {mockWhaleActivity.map((whale, index) => (
          <div 
            key={whale.id}
            className="p-3 rounded bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer animate-slide-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant={sourceColors[whale.source] as any || "muted"}>
                  {whale.source}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">{whale.wallet}</span>
              </div>
              <Badge variant="muted" className="text-[10px]">{whale.platform}</Badge>
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {whale.action.includes("买") || whale.action.includes("加") ? (
                  <ArrowDownRight className="w-4 h-4 text-success" />
                ) : whale.action.includes("卖") || whale.action.includes("转出") || whale.action.includes("空") ? (
                  <ArrowUpRight className="w-4 h-4 text-destructive" />
                ) : null}
                <span className={`text-sm font-medium ${
                  whale.action.includes("买") || whale.action.includes("加") ? "text-success" : 
                  whale.action.includes("卖") || whale.action.includes("空") ? "text-destructive" : 
                  "text-foreground"
                }`}>
                  {whale.action}
                </span>
                <Badge variant={whale.asset === "BTC" ? "warning" : whale.asset === "ETH" ? "default" : "muted"}>
                  {whale.asset}
                </Badge>
                <span className="font-mono text-sm text-foreground">{whale.amount}</span>
              </div>
              <span className="font-mono text-sm text-primary">{whale.value}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{whale.time}</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-primary cursor-pointer" />
            </div>
          </div>
        ))}
      </div>
    </DataCard>
  );
}
