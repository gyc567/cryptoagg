import { CryptoNewsItem } from '@/server/types';

export type NewsSubscriber = (news: CryptoNewsItem[]) => void;

class NewsService {
  private static instance: NewsService;
  private subscribers: Set<NewsSubscriber> = new Set();
  private news: CryptoNewsItem[] = [];
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.initializeMockData();
  }

  public static getInstance(): NewsService {
    if (!NewsService.instance) {
      NewsService.instance = new NewsService();
    }
    return NewsService.instance;
  }

  private initializeMockData() {
    this.news = [
      {
        id: '1',
        source: 'BlockBeats',
        title: '比特币突破10万美元关口，创历史新高',
        timestamp: Date.now() - 3 * 60000,
        importance: 'high',
      },
      {
        id: '2',
        source: 'CoinDesk',
        title: 'SEC批准多只现货比特币ETF申请',
        timestamp: Date.now() - 15 * 60000,
        importance: 'high',
      },
      {
        id: '3',
        source: 'The Block',
        title: '贝莱德比特币ETF日交易量创新纪录',
        timestamp: Date.now() - 28 * 60000,
        importance: 'normal',
      },
      {
        id: '4',
        source: 'CoinTelegraph',
        title: '以太坊Layer2总锁仓量突破400亿美元',
        timestamp: Date.now() - 45 * 60000,
        importance: 'normal',
      },
      {
        id: '5',
        source: 'CryptoSlate',
        title: 'MicroStrategy再次增持比特币',
        timestamp: Date.now() - 60 * 60000,
        importance: 'normal',
      },
      {
        id: '6',
        source: 'SoSoValue',
        title: '现货ETF单周净流入超30亿美元',
        timestamp: Date.now() - 65 * 60000,
        importance: 'normal',
      },
    ];
  }

  public subscribe(subscriber: NewsSubscriber): () => void {
    this.subscribers.add(subscriber);
    subscriber(this.news);

    if (this.subscribers.size === 1 && !this.pollInterval) {
      this.startPolling();
    }

    return () => {
      this.subscribers.delete(subscriber);
      if (this.subscribers.size === 0 && this.pollInterval) {
        this.stopPolling();
      }
    };
  }

  private startPolling() {
    // Simulate real-time news every 30 seconds
    this.pollInterval = setInterval(() => {
      this.fetchNewNews();
    }, 30000);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private fetchNewNews() {
    // In a real app, this would be an API call
    const sources = ['BlockBeats', 'CoinDesk', 'The Block', 'CoinTelegraph', 'CryptoSlate', 'SoSoValue'];
    const newsTemplates = [
      '市场数据显示，主流币种波动率近期显著提升',
      '某大户向交易所转入价值5000万美元的稳定币',
      '分析师：比特币减半效应可能在未来几个月进一步显现',
      '新锐公链项目宣布完成1000万美元种子轮融资',
      '多国监管机构联合发布关于加密资产洗钱风险的警示',
    ];

    const randomSource = sources[Math.floor(Math.random() * sources.length)];
    const randomTitle = newsTemplates[Math.floor(Math.random() * newsTemplates.length)];
    
    const newItem: CryptoNewsItem = {
      id: Math.random().toString(36).substring(7),
      source: randomSource,
      title: randomTitle,
      timestamp: Date.now(),
      importance: Math.random() > 0.8 ? 'high' : 'normal',
    };

    this.news = [newItem, ...this.news].slice(0, 50); // Keep last 50 items
    this.notifySubscribers();
  }

  private notifySubscribers() {
    this.subscribers.forEach(subscriber => subscriber(this.news));
  }

  // For testing purposes
  public reset() {
    this.stopPolling();
    this.subscribers.clear();
    this.initializeMockData();
  }
}

export const newsService = NewsService.getInstance();
