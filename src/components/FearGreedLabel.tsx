import { useFearGreedIndex } from '@/hooks/useFearGreedIndex';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function FearGreedLabel() {
  const { data, isLoading, error } = useFearGreedIndex();

  if (isLoading) {
    return <span className="font-mono text-sm text-muted-foreground">Loading...</span>;
  }

  if (error || !data) {
    return <span className="font-mono text-sm text-muted-foreground">N/A</span>;
  }

  const value = parseInt(data.value, 10);
  
  // Determine color and icon
  let colorClass = 'text-muted-foreground';
  let Icon = Minus;

  if (value >= 75) {
    colorClass = 'text-success'; // Extreme Greed
    Icon = TrendingUp;
  } else if (value >= 50) {
    colorClass = 'text-green-400'; // Greed
    Icon = TrendingUp;
  } else if (value >= 25) {
    colorClass = 'text-yellow-500'; // Fear
    Icon = TrendingDown;
  } else {
    colorClass = 'text-destructive'; // Extreme Fear
    Icon = TrendingDown;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm text-foreground font-medium">{data.value}</span>
      <div className={`flex items-center gap-0.5 ${colorClass}`}>
        <Icon className="w-3 h-3" />
        <span className="font-mono text-xs">{data.value_classification}</span>
      </div>
    </div>
  );
}
