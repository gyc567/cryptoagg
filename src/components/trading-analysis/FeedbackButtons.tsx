import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FeedbackButtonsProps {
  onFeedback: (helpful: boolean, comment?: string) => void;
  className?: string;
}

export function FeedbackButtons({ onFeedback, className }: FeedbackButtonsProps) {
  const [submitted, setSubmitted] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'helpful' | 'not-helpful' | null>(null);

  const handleFeedback = (helpful: boolean) => {
    if (submitted) return;
    setFeedbackType(helpful ? 'helpful' : 'not-helpful');
    setSubmitted(true);
    onFeedback(helpful);
  };

  if (submitted && feedbackType) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <span className={cn(
          'flex items-center gap-1',
          feedbackType === 'helpful' ? 'text-success' : 'text-destructive'
        )}>
          {feedbackType === 'helpful' ? (
            <>
              <ThumbsUp className="w-4 h-4" />
              感谢您的反馈！
            </>
          ) : (
            <>
              <ThumbsDown className="w-4 h-4" />
              感谢您的反馈，我们会持续改进
            </>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm text-muted-foreground mr-2">这个分析对你有帮助吗？</span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleFeedback(true)}
        className="gap-1.5"
      >
        <ThumbsUp className="w-4 h-4" />
        有帮助
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleFeedback(false)}
        className="gap-1.5"
      >
        <ThumbsDown className="w-4 h-4" />
        不太准确
      </Button>
    </div>
  );
}
