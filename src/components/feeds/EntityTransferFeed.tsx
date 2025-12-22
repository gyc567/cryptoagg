import { DataCard } from "@/components/ui/DataCard";
import { Badge } from "@/components/ui/CustomBadge";
import { Building2, ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react";

const mockEntityTransfers = [
  { 
    id: 1, 
    entity: "WLFI", 
    action: "买入", 
    asset: "ETH", 
    amount: "2,500", 
    value: "$8.6M", 
    time: "15分钟前",
    direction: "in"
  },
  { 
    id: 2, 
    entity: "门头沟", 
    action: "转出", 
    asset: "BTC", 
    amount: "1,200", 
    value: "$118M", 
    time: "2小时前",
    direction: "out"
  },
  { 
    id: 3, 
    entity: "美国政府", 
    action: "转出", 
    asset: "BTC", 
    amount: "10,000", 
    value: "$984M", 
    time: "5小时前",
    direction: "out"
  },
  { 
    id: 4, 
    entity: "不丹政府", 
    action: "持仓不变", 
    asset: "BTC", 
    amount: "13,029", 
    value: "$1.28B", 
    time: "1天前",
    direction: "neutral"
  },
  { 
    id: 5, 
    entity: "DBS Bank", 
    action: "增持", 
    asset: "BTC", 
    amount: "500", 
    value: "$49.2M", 
    time: "2天前",
    direction: "in"
  },
];

const entityColors: Record<string, string> = {
  "WLFI": "success",
  "门头沟": "warning",
  "美国政府": "destructive",
  "不丹政府": "default",
  "DBS Bank": "success",
};

export function EntityTransferFeed() {
  return (
    <DataCard 
      title="链上实体大额出入金" 
      icon={<Building2 className="w-4 h-4" />}
    >
      <div className="space-y-2">
        {mockEntityTransfers.map((transfer, index) => (
          <div 
            key={transfer.id}
            className="p-3 rounded bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer animate-slide-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant={entityColors[transfer.entity] as any || "muted"}>
                  {transfer.entity}
                </Badge>
                <span className="text-sm text-foreground font-medium">{transfer.action}</span>
              </div>
              <div className="flex items-center gap-1">
                {transfer.direction === "in" ? (
                  <ArrowDownRight className="w-4 h-4 text-success" />
                ) : transfer.direction === "out" ? (
                  <ArrowUpRight className="w-4 h-4 text-destructive" />
                ) : null}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={transfer.asset === "BTC" ? "warning" : "default"}>
                  {transfer.asset}
                </Badge>
                <span className="font-mono text-sm text-foreground">{transfer.amount}</span>
              </div>
              <span className="font-mono text-sm text-primary">{transfer.value}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">{transfer.time}</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-primary cursor-pointer" />
            </div>
          </div>
        ))}
      </div>
    </DataCard>
  );
}
