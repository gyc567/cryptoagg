import { useState, useEffect } from 'react';
import { CryptoNewsItem } from '@/server/types';
import { newsService } from '@/services/news';

export function useCryptoNews() {
  const [news, setNews] = useState<CryptoNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = newsService.subscribe((updatedNews) => {
      setNews(updatedNews);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { news, isLoading };
}
