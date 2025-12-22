import { DataCard } from "@/components/ui/DataCard";
import { Badge } from "@/components/ui/CustomBadge";
import { Twitter, Heart, Repeat2, MessageCircle } from "lucide-react";

const mockTweets = [
  { 
    id: 1, 
    author: "@elonmusk", 
    avatar: "EM",
    content: "Bitcoin 🚀", 
    likes: "125K", 
    retweets: "45K",
    time: "5分钟前",
    verified: true
  },
  { 
    id: 2, 
    author: "@VitalikButerin", 
    avatar: "VB",
    content: "Exciting developments in Ethereum scalability. The future is multi-rollup.", 
    likes: "28K", 
    retweets: "8.2K",
    time: "18分钟前",
    verified: true
  },
  { 
    id: 3, 
    author: "@caboredm", 
    avatar: "CB",
    content: "We're seeing unprecedented institutional inflows...", 
    likes: "12K", 
    retweets: "3.5K",
    time: "32分钟前",
    verified: true
  },
  { 
    id: 4, 
    author: "@WuBlockchain", 
    avatar: "WB",
    content: "据悉，某交易所正在准备重大公告...", 
    likes: "8.5K", 
    retweets: "2.1K",
    time: "45分钟前",
    verified: true
  },
  { 
    id: 5, 
    author: "@lookonchain", 
    avatar: "LC",
    content: "A whale just deposited 5,000 BTC to Binance 🐋", 
    likes: "15K", 
    retweets: "5.8K",
    time: "1小时前",
    verified: true
  },
];

export function TwitterFeed() {
  return (
    <DataCard 
      title="推特高影响力账号" 
      icon={<Twitter className="w-4 h-4" />}
      maxHeight="500px"
    >
      <div className="space-y-3">
        {mockTweets.map((tweet, index) => (
          <div 
            key={tweet.id}
            className="p-3 rounded bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer animate-slide-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-mono text-sm font-bold flex-shrink-0">
                {tweet.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-foreground">{tweet.author}</span>
                  {tweet.verified && (
                    <Badge variant="default" className="text-[10px] px-1">✓</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{tweet.time}</span>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed mb-2">
                  {tweet.content}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1 hover:text-destructive transition-colors">
                    <Heart className="w-3 h-3" />
                    <span>{tweet.likes}</span>
                  </div>
                  <div className="flex items-center gap-1 hover:text-success transition-colors">
                    <Repeat2 className="w-3 h-3" />
                    <span>{tweet.retweets}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DataCard>
  );
}
