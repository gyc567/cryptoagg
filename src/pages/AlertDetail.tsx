import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, DollarSign, Activity } from "lucide-react";
import { Badge } from "@/components/ui/CustomBadge";
import { MarketTakerAlert } from "@/server/types";

export default function AlertDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const alert = location.state?.alert as MarketTakerAlert | undefined;

  if (!alert) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-2xl font-bold mb-4">告警信息不存在或已过期</h2>
        <p className="text-muted-foreground mb-6">实时监控数据未持久化，请返回列表查看最新数据。</p>
        <Button onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> 返回列表
        </Button>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Format time
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Calculate total amount (Trade Value)
  // If tradeValue is explicitly provided in metrics, use it.
  // Otherwise calculate from tradeQty * midPrice (from context) or roughly estimate.
  // The MarketTakerAlertMetrics type has `tradeValue`.
  const totalAmount = alert.metrics.tradeValue || 
    ((alert.metrics.tradeQty || 0) * (alert.context.midPrice || 0));

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Button variant="ghost" className="mb-6" onClick={() => navigate("/")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> 返回列表
      </Button>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              {alert.symbol} 吃单详情
            </CardTitle>
            <Badge variant={alert.side === "BUY" ? "default" : "destructive"} className="text-lg px-3 py-1">
              {alert.side === "BUY" ? "买入" : "卖出"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          
          {/* Time */}
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span className="text-lg">时间</span>
            </div>
            <span className="text-xl font-mono font-medium">{formatTime(alert.timestamp)}</span>
          </div>

          {/* Direction */}
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="h-5 w-5" />
              <span className="text-lg">方向</span>
            </div>
            <span className={`text-xl font-bold ${alert.side === "BUY" ? "text-green-500" : "text-red-500"}`}>
              {alert.side === "BUY" ? "买入 (Long)" : "卖出 (Short)"}
            </span>
          </div>

          {/* Total Amount */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-5 w-5" />
              <span className="text-lg">总金额</span>
            </div>
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {formatCurrency(totalAmount)}
            </span>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
