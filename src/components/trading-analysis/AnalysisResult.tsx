import { SignalCard } from './SignalCard';
import { FeedbackButtons } from './FeedbackButtons';
import { TradingSignal } from '@/server/types';
import { Clock, Zap } from 'lucide-react';

interface AnalysisResultProps {
  signal: TradingSignal;
  previewUrl: string;
  onFeedback: (helpful: boolean) => void;
  className?: string;
}

export function AnalysisResult({
  signal,
  previewUrl,
  onFeedback,
  className,
}: AnalysisResultProps) {
  return (
    <div className={className}>
      {/* Image Preview */}
      <div className="mb-4">
        <div className="relative rounded-lg border-2 border-dashed border-border/50 overflow-hidden">
          <div className="aspect-video relative">
            <img
              src={previewUrl}
              alt="K线截图"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>

      {/* Processing Time Badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          分析耗时: {signal.processingTime}ms
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground">
          <Zap className="w-3 h-3" />
          模型版本: {signal.modelVersion}
        </span>
      </div>

      {/* Signal Card */}
      <SignalCard signal={signal} className="mb-4" />

      {/* Feedback */}
      <FeedbackButtons onFeedback={onFeedback} />
    </div>
  );
}
