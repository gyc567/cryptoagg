import { DataCard } from "@/components/ui/DataCard";
import { Badge } from "@/components/ui/CustomBadge";
import { ArrowRightLeft, ExternalLink, Wifi, WifiOff } from "lucide-react";
import { useLargeTransfers } from "@/hooks/useLargeTransfers";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

export function OnChainTransferFeed() {
  const { transfers, status } = useLargeTransfers();

  return (
    <DataCard 
      title="交易所大额成交实时监控" 
      icon={<ArrowRightLeft className="w-4 h-4" />}
      extra={
        <div className="flex items-center gap-1">
          {status === 'CONNECTED' ? (
            <Wifi className="w-3 h-3 text-success animate-pulse" />
          ) : (
            <WifiOff className="w-3 h-3 text-muted-foreground" />
          )}
          <span className="text-[10px] text-muted-foreground uppercase">{status}</span>
        </div>
      }
    >
      <div className="space-y-2 min-h-[200px]">
        {transfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
             <span className="text-sm">等待大额成交数据...</span>
             <span className="text-xs opacity-50 mt-1">阈值 &gt; $10M</span>
          </div>
        ) : (
          transfers.map((transfer) => (
            <div 
              key={transfer.txId}
              className="p-3 rounded bg-secondary/30 hover:bg-secondary/50 transition-colors animate-in fade-in slide-in-from-right-4 duration-300"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant={transfer.currency === "BTC" ? "warning" : transfer.currency === "ETH" ? "default" : "outline"}>
                    {transfer.currency}
                  </Badge>
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {transfer.amount.toFixed(4)} {transfer.currency}
                  </span>
                </div>
                <span className="font-mono text-xs text-primary">{transfer.value}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className={transfer.direction === "out" ? "text-destructive" : "text-muted-foreground"}>
                    {transfer.direction === 'out' ? '卖出' : '买入'}
                  </span>
                  <ArrowRightLeft className="w-3 h-3" />
                  <span className={transfer.direction === "in" ? "text-success" : "text-muted-foreground"}>
                    {transfer.exchange}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(transfer.timestamp, { addSuffix: true, locale: zhCN })}
                  </span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-primary cursor-pointer" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </DataCard>
  );
}
