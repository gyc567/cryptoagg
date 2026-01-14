import { Router } from 'express';
import { getAllAnalyses, getAnalysis } from '../services/storage.js';

const router = Router();

// GET /api/history - Get analysis history
router.get('/', (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    const result = getAllAnalyses(limit, offset);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history',
    });
  }
});

// GET /api/history/:id - Get specific analysis
router.get('/:id', (req, res) => {
  try {
    const record = getAnalysis(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found',
      });
    }

    res.json({
      success: true,
      data: record.signal,
    });
  } catch (error) {
    console.error('Analysis fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analysis',
    });
  }
});

export { router as historyRouter };
