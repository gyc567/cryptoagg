import { TrendingUp, TrendingDown, Activity, Zap } from "lucide-react";
import { useBinanceTicker } from "@/hooks/useBinanceTicker";
import { FearGreedLabel } from "@/components/FearGreedLabel";

export function StatsBar() {
  const { tickers, status } = useBinanceTicker(['BTC/USDT', 'ETH/USDT']);

  // 基础静态数据 (用于那些没有API的指标)
  const otherStats = [
    { label: "ETH/BTC", value: "0.0351", change: "-0.45%", positive: false },
    { label: "BTC.D", value: "54.2%", change: "+0.12%", positive: true },
    { label: "总市值", value: "$3.42T", change: "+1.56%", positive: true },
    { label: "24h成交", value: "$142B", change: "+18.3%", positive: true },
  ];

  // 格式化实时数据
  const formatTicker = (symbol: string, label: string) => {
    const data = tickers[symbol];
    if (!data) return { label, value: "Loading...", change: "---", positive: true };

    const isPositive = data.changePercent >= 0;
    return {
      label,
      value: data.price.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
      change: `${isPositive ? '+' : ''}${data.changePercent.toFixed(2)}%`,
      positive: isPositive
    };
  };

  const realStats = [
    formatTicker('BTC/USDT', 'BTC'),
    formatTicker('ETH/USDT', 'ETH')
  ];

  const allStats = [...realStats, ...otherStats];

  return (
    <div className="border-b border-border/30 bg-card/50 backdrop-blur-sm overflow-x-auto scrollbar-thin">
      <div className="container px-4">
        <div className="flex items-center gap-6 py-3 min-w-max">
          <div className="flex items-center gap-2 text-primary">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">实时行情</span>
          </div>
          
          {allStats.map((stat, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <span className="font-mono text-sm text-foreground font-medium">{stat.value}</span>
                <div className={`flex items-center gap-0.5 ${stat.positive ? "text-success" : "text-destructive"}`}>
                  {stat.positive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span className="font-mono text-xs">{stat.change}</span>
                </div>
              </div>
              <div className="w-px h-4 bg-border/50"></div>
            </div>
          ))}

          {/* 恐慌指数 (独立组件) */}
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">恐慌指数</span>
                <FearGreedLabel />
             </div>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <Zap className={`w-3 h-3 ${status === 'CONNECTED' ? 'text-success animate-pulse' : 'text-warning'}`} />
            <span className="text-xs text-muted-foreground">
              {status === 'CONNECTED' ? 'Live' : status} 
              {status === 'CONNECTED' && <span className="text-success font-mono ml-1">12ms</span>}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
