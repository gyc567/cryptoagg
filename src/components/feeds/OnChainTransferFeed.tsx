import { DataCard } from "@/components/ui/DataCard";
import { Badge } from "@/components/ui/CustomBadge";
import { ArrowRightLeft, ExternalLink } from "lucide-react";

const mockTransfers = [
  { id: 1, from: "Binance", to: "Unknown", asset: "BTC", amount: "2,500", value: "$245.8M", time: "2分钟前", direction: "out" },
  { id: 2, from: "Unknown", to: "Coinbase", asset: "ETH", amount: "45,000", value: "$155.7M", time: "5分钟前", direction: "in" },
  { id: 3, from: "OKX", to: "Unknown", asset: "BTC", amount: "1,200", value: "$118.1M", time: "8分钟前", direction: "out" },
  { id: 4, from: "Kraken", to: "Unknown", asset: "ETH", amount: "28,000", value: "$96.8M", time: "12分钟前", direction: "out" },
  { id: 5, from: "Unknown", to: "Bybit", asset: "BTC", amount: "890", value: "$87.6M", time: "15分钟前", direction: "in" },
];

export function OnChainTransferFeed() {
  return (
    <DataCard 
      title="交易所大额链上转账" 
      icon={<ArrowRightLeft className="w-4 h-4" />}
    >
      <div className="space-y-2">
        {mockTransfers.map((transfer, index) => (
          <div 
            key={transfer.id}
            className="p-3 rounded bg-secondary/30 hover:bg-secondary/50 transition-colors animate-slide-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant={transfer.asset === "BTC" ? "warning" : "default"}>
                  {transfer.asset}
                </Badge>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {transfer.amount} {transfer.asset}
                </span>
              </div>
              <span className="font-mono text-xs text-primary">{transfer.value}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className={transfer.direction === "out" ? "text-destructive" : "text-muted-foreground"}>
                  {transfer.from}
                </span>
                <ArrowRightLeft className="w-3 h-3" />
                <span className={transfer.direction === "in" ? "text-success" : "text-muted-foreground"}>
                  {transfer.to}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{transfer.time}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-primary cursor-pointer" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </DataCard>
  );
}
