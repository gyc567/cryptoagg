import { DataCard } from "@/components/ui/DataCard";
import { Badge } from "@/components/ui/CustomBadge";
import { Newspaper, ExternalLink } from "lucide-react";

const mockNews = [
  { id: 1, source: "BlockBeats", title: "比特币突破10万美元关口，创历史新高", time: "3分钟前", urgent: true },
  { id: 2, source: "CoinDesk", title: "SEC批准多只现货比特币ETF申请", time: "15分钟前", urgent: true },
  { id: 3, source: "The Block", title: "贝莱德比特币ETF日交易量创新纪录", time: "28分钟前", urgent: false },
  { id: 4, source: "CoinTelegraph", title: "以太坊Layer2总锁仓量突破400亿美元", time: "45分钟前", urgent: false },
  { id: 5, source: "CryptoSlate", title: "MicroStrategy再次增持比特币", time: "1小时前", urgent: false },
  { id: 6, source: "SoSoValue", title: "现货ETF单周净流入超30亿美元", time: "1小时前", urgent: false },
];

const sourceColors: Record<string, string> = {
  "BlockBeats": "default",
  "CoinDesk": "success",
  "The Block": "warning",
  "CoinTelegraph": "default",
  "CryptoSlate": "muted",
  "SoSoValue": "success",
};

export function NewsFeed() {
  return (
    <DataCard 
      title="加密快讯" 
      icon={<Newspaper className="w-4 h-4" />}
      maxHeight="500px"
    >
      <div className="space-y-2">
        {mockNews.map((news, index) => (
          <div 
            key={news.id}
            className="p-3 rounded bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group animate-slide-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <Badge variant={sourceColors[news.source] as any || "muted"}>
                {news.source}
              </Badge>
              {news.urgent && (
                <Badge variant="destructive">重要</Badge>
              )}
            </div>
            <p className="text-sm text-foreground leading-relaxed group-hover:text-primary transition-colors">
              {news.title}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">{news.time}</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </DataCard>
  );
}
