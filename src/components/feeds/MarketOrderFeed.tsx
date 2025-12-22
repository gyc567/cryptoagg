import { DataCard } from "@/components/ui/DataCard";
import { Badge } from "@/components/ui/CustomBadge";
import { TrendingUp, TrendingDown, AlertTriangle, Zap } from "lucide-react";
import { useMarketDataMonitor } from "@/hooks/useMarketDataMonitor";
import { DetectionType } from "@/server/types";

/**
 * 获取风险等级的颜色
 */
function getSeverityColor(severity: number): string {
  if (severity >= 8) return "text-destructive"; // 红色：严重
  if (severity >= 6) return "text-yellow-500"; // 黄色：警告
  return "text-yellow-600"; // 橙色：注意
}

/**
 * 获取风险等级的背景颜色
 */
function getSeverityBgColor(severity: number): string {
  if (severity >= 8) return "bg-destructive/10";
  if (severity >= 6) return "bg-yellow-500/10";
  return "bg-yellow-600/10";
}

/**
 * 获取检测类型的标签
 */
function getDetectionTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    [DetectionType.LARGE_TRADE]: "大额成交",
    [DetectionType.ORDERBOOK_IMBALANCE]: "订单簿失衡",
    [DetectionType.SLIPPAGE_SPIKE]: "滑点异常",
  };
  return typeMap[type] || type;
}

/**
 * 格式化时间
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * 格式化数字
 */
function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}

export function MarketOrderFeed() {
  const { alerts, isLoading, alertCount } = useMarketDataMonitor({
    symbols: ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
    maxAlerts: 20,
  });

  return (
    <DataCard
      title={`交易所市价吃单监控 (${alertCount} 条告警)`}
      icon={<Zap className="w-4 h-4" />}
    >
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <div className="animate-spin mr-2">⏳</div>
            <span>加载中...</span>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <span>暂无告警</span>
          </div>
        ) : (
          alerts.map((alert, index) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-3 rounded border animate-slide-in transition-colors ${getSeverityBgColor(
                alert.severity
              )} border-l-4 ${alert.severity >= 8 ? "border-l-destructive" : "border-l-yellow-500"}`}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* 左侧：交易所和币对 */}
              <div className="flex items-center gap-3 flex-1">
                <AlertTriangle className={`w-4 h-4 ${getSeverityColor(alert.severity)}`} />
                <Badge variant="muted">{alert.exchange}</Badge>
                <span className="font-mono font-bold text-sm text-foreground">
                  {alert.symbol}
                </span>
                <Badge
                  variant={alert.side === "BUY" ? "default" : "destructive"}
                  className="text-xs"
                >
                  {alert.side === "BUY" ? "买方吃单" : "卖方吃单"}
                </Badge>
              </div>

              {/* 右侧：检测类型、风险等级和时间 */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {getDetectionTypeLabel(alert.detectionType)}
                    </span>
                    <span className={`font-bold text-sm ${getSeverityColor(alert.severity)}`}>
                      ⚠️ {alert.severity}/10
                    </span>
                  </div>

                  {/* 告警指标 */}
                  <div className="text-xs text-muted-foreground mt-1">
                    {alert.metrics.tradeQty !== undefined && (
                      <span>成交: {formatNumber(alert.metrics.tradeQty, 2)} • </span>
                    )}
                    {alert.metrics.slippagePercent !== undefined && (
                      <span>滑点: {formatNumber(alert.metrics.slippagePercent, 2)}% • </span>
                    )}
                    {alert.metrics.volumeRatioVsDailyAvg !== undefined && (
                      <span>日均比: {formatNumber(alert.metrics.volumeRatioVsDailyAvg, 2)}x</span>
                    )}
                  </div>
                </div>

                <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {formatTime(alert.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 底部统计信息 */}
      <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>最高风险等级:</span>
          <span className="font-mono">
            {alerts.length > 0
              ? `${Math.max(...alerts.map(a => a.severity))}/10`
              : "N/A"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>平均置信度:</span>
          <span className="font-mono">
            {alerts.length > 0
              ? `${formatNumber((alerts.reduce((sum, a) => sum + a.confidence, 0) / alerts.length) * 100, 0)}%`
              : "N/A"}
          </span>
        </div>
      </div>
    </DataCard>
  );
}
