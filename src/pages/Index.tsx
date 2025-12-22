import { Header } from "@/components/Header";
import { StatsBar } from "@/components/StatsBar";
import { MarketOrderFeed } from "@/components/feeds/MarketOrderFeed";
import { OnChainTransferFeed } from "@/components/feeds/OnChainTransferFeed";
import { NewsFeed } from "@/components/feeds/NewsFeed";
import { TwitterFeed } from "@/components/feeds/TwitterFeed";
import { MacroNewsFeed } from "@/components/feeds/MacroNewsFeed";
import { EntityTransferFeed } from "@/components/feeds/EntityTransferFeed";
import { AbnormalVolumeFeed } from "@/components/feeds/AbnormalVolumeFeed";
import { WhaleFeed } from "@/components/feeds/WhaleFeed";
import { SpecialChannelFeed } from "@/components/feeds/SpecialChannelFeed";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StatsBar />
      
      <main className="container px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Row 1: Core Trading Signals */}
          <div className="lg:col-span-1">
            <MarketOrderFeed />
          </div>
          <div className="lg:col-span-1">
            <OnChainTransferFeed />
          </div>
          <div className="lg:col-span-1">
            <AbnormalVolumeFeed />
          </div>
          <div className="lg:col-span-1">
            <SpecialChannelFeed />
          </div>
          
          {/* Row 2: News & Social */}
          <div className="lg:col-span-1 xl:row-span-2">
            <NewsFeed />
          </div>
          <div className="lg:col-span-1 xl:row-span-2">
            <TwitterFeed />
          </div>
          <div className="lg:col-span-1">
            <MacroNewsFeed />
          </div>
          <div className="lg:col-span-1">
            <EntityTransferFeed />
          </div>
          
          {/* Row 3: Whale Tracking */}
          <div className="lg:col-span-2 xl:col-span-2">
            <WhaleFeed />
          </div>
        </div>
      </main>
      
      <footer className="border-t border-border/30 py-4 mt-8">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>© 2024 CryptoAgg</span>
              <span>•</span>
              <span>数据仅供参考，不构成投资建议</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                9个数据源在线
              </span>
              <span>上次更新: 刚刚</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
