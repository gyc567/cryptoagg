import { DataCard } from "@/components/ui/DataCard";
import { Badge } from "@/components/ui/CustomBadge";
import { TrendingUp, TrendingDown } from "lucide-react";

const mockOrders = [
  { id: 1, exchange: "Binance", pair: "BTC/USDT", side: "buy", amount: "125.5", price: "98,432", time: "12:45:32" },
  { id: 2, exchange: "OKX", pair: "ETH/USDT", side: "sell", amount: "2,340", price: "3,456", time: "12:45:28" },
  { id: 3, exchange: "Coinbase", pair: "BTC/USD", side: "buy", amount: "89.2", price: "98,440", time: "12:45:25" },
  { id: 4, exchange: "Bybit", pair: "BTC/USDT", side: "sell", amount: "156.8", price: "98,428", time: "12:45:21" },
  { id: 5, exchange: "Kraken", pair: "ETH/USD", side: "buy", amount: "1,890", price: "3,458", time: "12:45:18" },
  { id: 6, exchange: "Binance", pair: "BTC/USDT", side: "buy", amount: "234.1", price: "98,445", time: "12:45:15" },
];

export function MarketOrderFeed() {
  return (
    <DataCard 
      title="交易所市价吃单监控" 
      icon={<TrendingUp className="w-4 h-4" />}
    >
      <div className="space-y-2">
        {mockOrders.map((order, index) => (
          <div 
            key={order.id}
            className="flex items-center justify-between p-2 rounded bg-secondary/30 hover:bg-secondary/50 transition-colors animate-slide-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <Badge variant="muted">{order.exchange}</Badge>
              <span className="font-mono text-sm text-foreground">{order.pair}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {order.side === "buy" ? (
                  <TrendingUp className="w-3 h-3 text-success" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-destructive" />
                )}
                <span className={`font-mono text-sm ${order.side === "buy" ? "text-success" : "text-destructive"}`}>
                  {order.amount}
                </span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">${order.price}</span>
              <span className="font-mono text-xs text-muted-foreground">{order.time}</span>
            </div>
          </div>
        ))}
      </div>
    </DataCard>
  );
}
