import { DataCard } from "@/components/ui/DataCard";
import { Badge } from "@/components/ui/CustomBadge";
import { Globe, TrendingUp, TrendingDown, Minus } from "lucide-react";

const mockMacroNews = [
  { 
    id: 1, 
    source: "金十数据", 
    title: "美联储利率决议：维持利率不变，符合市场预期", 
    impact: "neutral",
    time: "10分钟前",
    category: "央行"
  },
  { 
    id: 2, 
    source: "Bloomberg", 
    title: "美国11月CPI同比上涨3.1%，低于预期", 
    impact: "bullish",
    time: "25分钟前",
    category: "通胀"
  },
  { 
    id: 3, 
    source: "Reuters", 
    title: "中国央行下调MLF利率25个基点", 
    impact: "bullish",
    time: "1小时前",
    category: "央行"
  },
  { 
    id: 4, 
    source: "WSJ", 
    title: "美债收益率跌破4%关口，创两个月新低", 
    impact: "bullish",
    time: "2小时前",
    category: "债券"
  },
  { 
    id: 5, 
    source: "金十数据", 
    title: "美国初请失业金人数升至21.8万，高于预期", 
    impact: "bearish",
    time: "3小时前",
    category: "就业"
  },
];

const impactIcons = {
  bullish: <TrendingUp className="w-3 h-3" />,
  bearish: <TrendingDown className="w-3 h-3" />,
  neutral: <Minus className="w-3 h-3" />,
};

const impactColors = {
  bullish: "success",
  bearish: "destructive",
  neutral: "muted",
};

export function MacroNewsFeed() {
  return (
    <DataCard 
      title="宏观快讯" 
      icon={<Globe className="w-4 h-4" />}
    >
      <div className="space-y-2">
        {mockMacroNews.map((news, index) => (
          <div 
            key={news.id}
            className="p-3 rounded bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer animate-slide-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="muted">{news.source}</Badge>
                <Badge variant="muted" className="text-[10px]">{news.category}</Badge>
              </div>
              <div className={`flex items-center gap-1 text-${impactColors[news.impact as keyof typeof impactColors]}`}>
                {impactIcons[news.impact as keyof typeof impactIcons]}
                <Badge variant={impactColors[news.impact as keyof typeof impactColors] as any}>
                  {news.impact === "bullish" ? "利好" : news.impact === "bearish" ? "利空" : "中性"}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{news.title}</p>
            <span className="text-xs text-muted-foreground mt-1 block">{news.time}</span>
          </div>
        ))}
      </div>
    </DataCard>
  );
}
