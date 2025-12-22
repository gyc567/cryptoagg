import { DataCard } from "@/components/ui/DataCard";
import { Badge } from "@/components/ui/CustomBadge";
import { BarChart3, AlertTriangle } from "lucide-react";

const mockAbnormalVolumes = [
  { 
    id: 1, 
    exchange: "Binance", 
    pair: "BTC/USDT", 
    type: "大额买单", 
    amount: "$45M", 
    price: "98,500",
    deviation: "+340%",
    time: "刚刚"
  },
  { 
    id: 2, 
    exchange: "OKX", 
    pair: "ETH/USDT", 
    type: "挂单墙", 
    amount: "$28M", 
    price: "3,400",
    deviation: "买方",
    time: "3分钟前"
  },
  { 
    id: 3, 
    exchange: "Bybit", 
    pair: "SOL/USDT", 
    type: "异常成交", 
    amount: "$12M", 
    price: "245",
    deviation: "+180%",
    time: "8分钟前"
  },
  { 
    id: 4, 
    exchange: "Coinbase", 
    pair: "BTC/USD", 
    type: "大额卖单", 
    amount: "$35M", 
    price: "98,200",
    deviation: "-220%",
    time: "15分钟前"
  },
];

export function AbnormalVolumeFeed() {
  return (
    <DataCard 
      title="异常交易量监控" 
      icon={<BarChart3 className="w-4 h-4" />}
    >
      <div className="space-y-2">
        {mockAbnormalVolumes.map((item, index) => (
          <div 
            key={item.id}
            className="p-3 rounded bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer border-l-2 border-warning animate-slide-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <Badge variant="muted">{item.exchange}</Badge>
                <span className="font-mono text-sm text-foreground">{item.pair}</span>
              </div>
              <Badge 
                variant={item.type.includes("买") ? "success" : item.type.includes("卖") ? "destructive" : "warning"}
              >
                {item.type}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm text-primary">{item.amount}</span>
                <span className="font-mono text-xs text-muted-foreground">@{item.price}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-xs ${item.deviation.startsWith("+") ? "text-success" : item.deviation.startsWith("-") ? "text-destructive" : "text-warning"}`}>
                  {item.deviation}
                </span>
                <span className="text-xs text-muted-foreground">{item.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DataCard>
  );
}
