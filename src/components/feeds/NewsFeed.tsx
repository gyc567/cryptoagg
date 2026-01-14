import { DataCard } from "@/components/ui/DataCard";
import { Badge } from "@/components/ui/CustomBadge";
import { Newspaper, ExternalLink } from "lucide-react";
import { useCryptoNews } from "@/hooks/useCryptoNews";
import { Skeleton } from "@/components/ui/skeleton";

const sourceColors: Record<string, string> = {
  "BlockBeats": "default",
  "CoinDesk": "success",
  "The Block": "warning",
  "CoinTelegraph": "default",
  "CryptoSlate": "muted",
  "SoSoValue": "success",
};

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "刚刚";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  return new Date(timestamp).toLocaleDateString();
}

export function NewsFeed() {
  const { news, isLoading } = useCryptoNews();

  return (
    <DataCard 
      title="加密快讯" 
      icon={<Newspaper className="w-4 h-4" />}
      maxHeight="500px"
    >
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))
        ) : (
          news.map((item, index) => (
            <div 
              key={item.id}
              className="p-3 rounded bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group animate-slide-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge variant={(sourceColors[item.source] as "default" | "success" | "warning" | "destructive" | "outline" | "secondary" | "muted") || "muted"}>
                  {item.source}
                </Badge>
                {item.importance === 'high' && (
                  <Badge variant="destructive">重要</Badge>
                )}
              </div>
              <p className="text-sm text-foreground leading-relaxed group-hover:text-primary transition-colors">
                {item.title}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">{formatTimeAgo(item.timestamp)}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          ))
        )}
      </div>
    </DataCard>
  );
}
