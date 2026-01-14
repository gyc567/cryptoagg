import { Router } from 'express';
import { addFeedback, getFeedbackStats } from '../services/storage.js';

const router = Router();

// POST /api/feedback - Submit feedback for an analysis
router.post('/', (req, res) => {
  try {
    const { signalId, helpful, comment } = req.body;

    if (!signalId || helpful === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'signalId and helpful are required',
      });
    }

    const success = addFeedback(signalId, helpful, comment);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Signal not found',
        message: 'The specified signal ID does not exist',
      });
    }

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback',
    });
  }
});

// GET /api/feedback/stats - Get feedback statistics
router.get('/stats', (_req, res) => {
  try {
    const stats = getFeedbackStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Feedback stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feedback stats',
    });
  }
});

export { router as feedbackRouter };
