import { useState, useEffect } from 'react';
import { History, ChevronRight, Clock } from 'lucide-react';
import { TradingSignal } from '@/server/types';
import { cn } from '@/lib/utils';

interface HistoryListProps {
  signals: TradingSignal[];
  onSelect: (signal: TradingSignal) => void;
  className?: string;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${price.toFixed(2)}`;
}

export function HistoryList({ signals, onSelect, className }: HistoryListProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (signals.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 text-center', className)}>
        <History className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">暂无历史分析记录</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {signals.map((signal, index) => (
        <button
          key={signal.id}
          onClick={() => onSelect(signal)}
          className={cn(
            'w-full flex items-center justify-between p-3 rounded-lg',
            'bg-muted/30 hover:bg-muted/50 transition-colors',
            'text-left animate-slide-in'
          )}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              signal.direction === 'LONG' && 'bg-success/10 text-success',
              signal.direction === 'SHORT' && 'bg-destructive/10 text-destructive',
              signal.direction === 'NEUTRAL' && 'bg-muted text-muted-foreground'
            )}>
              {signal.direction === 'LONG' && '↗'}
              {signal.direction === 'SHORT' && '↘'}
              {signal.direction === 'NEUTRAL' && '→'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {signal.symbol || 'BTC/USDT'}
                </span>
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded',
                  signal.direction === 'LONG' && 'bg-success/10 text-success',
                  signal.direction === 'SHORT' && 'bg-destructive/10 text-destructive',
                  signal.direction === 'NEUTRAL' && 'bg-muted text-muted-foreground'
                )}>
                  {signal.direction}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{formatRelativeTime(signal.timestamp)}</span>
                <span>•</span>
                <span>{signal.confidence}% 置信度</span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}
