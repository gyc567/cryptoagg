import { useState, useCallback, useEffect } from 'react';
import { BrainCircuit } from 'lucide-react';
import { Header } from '@/components/Header';
import { ImageUploader } from '@/components/trading-analysis/ImageUploader';
import { ChatInterface } from '@/components/trading-analysis/ChatInterface';
import { AnalysisResult } from '@/components/trading-analysis/AnalysisResult';
import { HistoryList } from '@/components/trading-analysis/HistoryList';
import { TradingSignal, AnalysisState, ChatMessage } from '@/server/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TradingAnalysis = () => {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ status: 'idle' });
  const [currentSignal, setCurrentSignal] = useState<TradingSignal | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<TradingSignal[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/history?limit=20`);
      const data = await response.json();
      if (data.success) {
        setHistory(data.data.signals);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleImageSelect = useCallback(async (file: File) => {
    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAnalysisState({ status: 'uploading' });
    setError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      setAnalysisState({ status: 'analyzing', progress: 0, message: '正在上传图片...' });

      const response = await fetch(`${API_BASE}/api/analysis/analyze`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '分析失败');
      }

      const signal = data.data.signal;
      setCurrentSignal(signal);
      setHistory(prev => [signal, ...prev].slice(0, 20));
      setAnalysisState({ status: 'completed', signal });

      setMessages(prev => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          role: 'user',
          content: '我已经上传了 K 线截图，请帮我分析。',
          timestamp: Date.now(),
        },
        {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: `分析完成！检测到${signal.direction === 'LONG' ? '多头' : signal.direction === 'SHORT' ? '空头' : '中性'}信号，置信度 ${signal.confidence}%。以下是详细交易建议。`,
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '分析失败，请重试';
      setError(errorMessage);
      setAnalysisState({ status: 'error', error: errorMessage });
    }
  }, []);

  const handleImageRemove = useCallback(() => {
    setImage(null);
    setPreviewUrl(null);
    setAnalysisState({ status: 'idle' });
    setCurrentSignal(null);
    setError(null);
  }, []);

  const handleFeedback = useCallback(async (helpful: boolean) => {
    if (!currentSignal) return;

    try {
      await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signalId: currentSignal.id,
          helpful,
        }),
      });
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  }, [currentSignal]);

  const handleSendMessage = useCallback((message: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: Date.now(),
      },
    ]);

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: '感谢您的提问！目前我只支持图片分析功能，关于这张 K 线图的具体问题，您可以查看上方的分析结果。如需进一步讨论，建议结合更多技术指标和基本面信息。',
          timestamp: Date.now(),
        },
      ]);
    }, 1000);
  }, []);

  const handleHistorySelect = useCallback((signal: TradingSignal) => {
    setCurrentSignal(signal);
    setPreviewUrl(signal.sourceImageUrl ? `${API_BASE}${signal.sourceImageUrl}` : null);
    setAnalysisState({ status: 'completed', signal });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BrainCircuit className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI 交易分析</h1>
              <p className="text-sm text-muted-foreground">
                上传 K 线截图，AI 智能分析并生成交易信号
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border border-border/50 bg-card">
              <div className="p-4 border-b border-border/50">
                <h2 className="font-semibold">上传 K 线截图</h2>
              </div>
              <div className="p-4">
                <ImageUploader
                  image={image}
                  previewUrl={previewUrl}
                  onImageSelect={handleImageSelect}
                  onImageRemove={handleImageRemove}
                  disabled={analysisState.status === 'analyzing'}
                />
              </div>
            </div>

            {currentSignal && previewUrl && (
              <div className="rounded-lg border border-border/50 bg-card">
                <div className="p-4 border-b border-border/50">
                  <h2 className="font-semibold">分析结果</h2>
                </div>
                <div className="p-4">
                  <AnalysisResult
                    signal={currentSignal}
                    previewUrl={previewUrl}
                    onFeedback={handleFeedback}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
              <div className="p-4 border-b border-border/50">
                <h2 className="font-semibold">AI 助手</h2>
              </div>
              <div className="h-[400px]">
                <ChatInterface
                  messages={messages}
                  isAnalyzing={analysisState.status === 'analyzing'}
                  onSendMessage={handleSendMessage}
                  disabled={analysisState.status === 'analyzing'}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border/50 bg-card">
              <div className="p-4 border-b border-border/50">
                <h2 className="font-semibold">历史记录</h2>
              </div>
              <div className="p-4 max-h-[300px] overflow-y-auto">
                <HistoryList
                  signals={history}
                  onSelect={handleHistorySelect}
                />
              </div>
            </div>
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
              <span>AI 分析仅供辅助决策，请谨慎使用</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TradingAnalysis;
