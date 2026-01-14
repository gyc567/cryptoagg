export type TradingSignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface TradingSignalAnalysis {
  indicators: string[];
  pattern: string;
  summary: string;
}

export interface TradingSignal {
  id: string;
  timestamp: number;
  direction: TradingSignalDirection;
  confidence: number;
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
  positionSize: number;
  leverage: number;
  riskRewardRatio: number;
  analysis: TradingSignalAnalysis;
  sourceImageUrl: string;
  symbol?: string;
  modelVersion: string;
  processingTime: number;
}

export interface AnalysisFeedback {
  signalId: string;
  helpful: boolean;
  comment?: string;
  timestamp: number;
}

export interface AnalysisRecord {
  signal: TradingSignal;
  feedback?: AnalysisFeedback;
}
