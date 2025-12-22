import { TrendingUp, TrendingDown, Activity, Zap } from "lucide-react";

const stats = [
  { label: "BTC", value: "$98,432", change: "+2.34%", positive: true },
  { label: "ETH", value: "$3,456", change: "+1.89%", positive: true },
  { label: "ETH/BTC", value: "0.0351", change: "-0.45%", positive: false },
  { label: "BTC.D", value: "54.2%", change: "+0.12%", positive: true },
  { label: "总市值", value: "$3.42T", change: "+1.56%", positive: true },
  { label: "24h成交", value: "$142B", change: "+18.3%", positive: true },
  { label: "恐慌指数", value: "75", change: "贪婪", positive: true },
];

export function StatsBar() {
  return (
    <div className="border-b border-border/30 bg-card/50 backdrop-blur-sm overflow-x-auto scrollbar-thin">
      <div className="container px-4">
        <div className="flex items-center gap-6 py-3 min-w-max">
          <div className="flex items-center gap-2 text-primary">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">实时行情</span>
          </div>
          
          {stats.map((stat, index) => (
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
              {index < stats.length - 1 && (
                <div className="w-px h-4 bg-border/50"></div>
              )}
            </div>
          ))}
          
          <div className="flex items-center gap-2 ml-auto">
            <Zap className="w-3 h-3 text-warning animate-pulse" />
            <span className="text-xs text-muted-foreground">延迟: <span className="text-success font-mono">12ms</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
