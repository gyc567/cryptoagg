import { v4 as uuidv4 } from 'uuid';
import { TradingSignal, AnalysisFeedback, AnalysisRecord } from '../utils/types.js';

// In-memory storage (replace with database in production)
const records: Map<string, AnalysisRecord> = new Map();

export function saveAnalysis(signal: TradingSignal): AnalysisRecord {
  const record: AnalysisRecord = {
    signal,
  };
  records.set(signal.id, record);
  return record;
}

export function getAnalysis(id: string): AnalysisRecord | null {
  return records.get(id) || null;
}

export function getAllAnalyses(limit: number = 20, offset: number = 0): {
  signals: TradingSignal[];
  total: number;
  hasMore: boolean;
} {
  const allRecords = Array.from(records.values())
    .sort((a, b) => b.signal.timestamp - a.signal.timestamp);

  const signals = allRecords
    .slice(offset, offset + limit)
    .map(r => r.signal);

  return {
    signals,
    total: allRecords.length,
    hasMore: offset + limit < allRecords.length,
  };
}

export function addFeedback(
  signalId: string,
  helpful: boolean,
  comment?: string
): boolean {
  const record = records.get(signalId);
  if (!record) return false;

  record.feedback = {
    signalId,
    helpful,
    comment,
    timestamp: Date.now(),
  };

  return true;
}

export function getFeedbackStats(): {
  total: number;
  helpful: number;
  notHelpful: number;
} {
  let total = 0;
  let helpful = 0;
  let notHelpful = 0;

  for (const record of records.values()) {
    if (record.feedback) {
      total++;
      if (record.feedback.helpful) {
        helpful++;
      } else {
        notHelpful++;
      }
    }
  }

  return { total, helpful, notHelpful };
}
