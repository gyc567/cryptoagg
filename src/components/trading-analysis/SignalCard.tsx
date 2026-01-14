import { ArrowUp, ArrowDown, TrendingUp, Target, Shield, DollarSign, Zap } from 'lucide-react';
import { TradingSignal, TradingSignalDirection } from '@/server/types';
import { cn } from '@/lib/utils';

interface SignalCardProps {
  signal: TradingSignal;
  className?: string;
}

const directionConfig: Record<TradingSignalDirection, { color: string; bg: string; icon: typeof ArrowUp; label: string }> = {
  LONG: {
    color: 'text-success',
    bg: 'bg-success/10 border-success/30',
    icon: ArrowUp,
    label: '多头信号 (Long)',
  },
  SHORT: {
    color: 'text-destructive',
    bg: 'bg-destructive/10 border-destructive/30',
    icon: ArrowDown,
    label: '空头信号 (Short)',
  },
  NEUTRAL: {
    color: 'text-muted-foreground',
    bg: 'bg-muted/50 border-muted',
    icon: TrendingUp,
    label: '中性 (Neutral)',
  },
};

function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${price.toFixed(2)}`;
}

function formatPositionSize(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

export function SignalCard({ signal, className }: SignalCardProps) {
  const config = directionConfig[signal.direction];
  const DirectionIcon = config.icon;

  const profitPercent = ((signal.takeProfit - signal.entryPrice) / signal.entryPrice) * 100;
  const lossPercent = ((signal.entryPrice - signal.stopLoss) / signal.entryPrice) * 100;

  return (
    <div className={cn('rounded-lg border-2 overflow-hidden', config.bg, className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <DirectionIcon className={cn('w-5 h-5', config.color)} />
          <span className={cn('font-semibold', config.color)}>{config.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">置信度</span>
          <span className={cn(
            'text-sm font-bold px-2 py-0.5 rounded',
            signal.confidence >= 80 ? 'bg-success/20 text-success' :
            signal.confidence >= 60 ? 'bg-yellow-500/20 text-yellow-500' :
            'bg-muted text-muted-foreground'
          )}>
            {signal.confidence}%
          </span>
        </div>
      </div>

      {/* Entry/Exit Levels */}
      <div className="p-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
            <Target className="w-3 h-3" />
            <span>入场点</span>
          </div>
          <div className="text-lg font-bold font-mono text-foreground">
            {formatPrice(signal.entryPrice)}
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
            <TrendingUp className="w-3 h-3" />
            <span>止盈</span>
          </div>
          <div className="text-lg font-bold font-mono text-success">
            {formatPrice(signal.takeProfit)}
            <span className="text-xs ml-1">(+{profitPercent.toFixed(2)}%)</span>
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
            <Shield className="w-3 h-3" />
            <span>止损</span>
          </div>
          <div className="text-lg font-bold font-mono text-destructive">
            {formatPrice(signal.stopLoss)}
            <span className="text-xs ml-1">(-{lossPercent.toFixed(2)}%)</span>
          </div>
        </div>
      </div>

      {/* Risk Management */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-2 rounded bg-background/50">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">仓位</div>
            <div className="text-sm font-semibold">{formatPositionSize(signal.positionSize)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded bg-background/50">
          <Zap className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">杠杆</div>
            <div className="text-sm font-semibold">{signal.leverage}x</div>
          </div>
        </div>
      </div>

      {/* Technical Analysis */}
      <div className="px-4 pb-4">
        <div className="p-3 rounded bg-background/30 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              技术分析
            </span>
          </div>
          
          {/* Indicators */}
          <div className="flex flex-wrap gap-1 mb-2">
            {signal.analysis.indicators.map((indicator) => (
              <span
                key={indicator}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary/10 text-primary"
              >
                {indicator}
              </span>
            ))}
          </div>

          {/* Pattern */}
          {signal.analysis.pattern && (
            <p className="text-sm text-foreground mb-2">
              <span className="font-medium">形态:</span> {signal.analysis.pattern}
            </p>
          )}

          {/* Summary */}
          <p className="text-sm text-muted-foreground">
            {signal.analysis.summary}
          </p>
        </div>
      </div>
    </div>
  );
}
