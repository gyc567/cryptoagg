import { DataCard } from "@/components/ui/DataCard";
import { Badge } from "@/components/ui/CustomBadge";
import { Bell, FileText, ExternalLink } from "lucide-react";

const mockSpecialUpdates = [
  { 
    id: 1, 
    source: "CME FedWatch", 
    title: "1月利率维持不变概率升至89.3%", 
    category: "利率期货",
    urgency: "high",
    time: "实时更新"
  },
  { 
    id: 2, 
    source: "SEC EDGAR", 
    title: "MicroStrategy提交8-K文件：新增购买15,000 BTC", 
    category: "监管文件",
    urgency: "high",
    time: "30分钟前"
  },
  { 
    id: 3, 
    source: "门头沟官网", 
    title: "第三批债权人偿付计划公告更新", 
    category: "官方公告",
    urgency: "medium",
    time: "2小时前"
  },
  { 
    id: 4, 
    source: "白宫", 
    title: "关于数字资产监管框架的行政命令草案", 
    category: "政策法规",
    urgency: "high",
    time: "1天前"
  },
  { 
    id: 5, 
    source: "Strategy 8-K", 
    title: "季度财报：比特币持仓未实现收益$4.2B", 
    category: "财务披露",
    urgency: "medium",
    time: "3天前"
  },
];

const urgencyColors = {
  high: "destructive",
  medium: "warning",
  low: "muted",
};

export function SpecialChannelFeed() {
  return (
    <DataCard 
      title="特殊渠道监控" 
      icon={<Bell className="w-4 h-4" />}
    >
      <div className="space-y-2">
        {mockSpecialUpdates.map((update, index) => (
          <div 
            key={update.id}
            className={`p-3 rounded bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer animate-slide-in ${
              update.urgency === "high" ? "border-l-2 border-destructive" : ""
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <Badge variant={urgencyColors[update.urgency as keyof typeof urgencyColors] as any}>
                  {update.source}
                </Badge>
              </div>
              <Badge variant="muted" className="text-[10px]">{update.category}</Badge>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{update.title}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">{update.time}</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-primary cursor-pointer" />
            </div>
          </div>
        ))}
      </div>
    </DataCard>
  );
}
