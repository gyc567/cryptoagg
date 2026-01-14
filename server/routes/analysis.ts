import { Router } from 'express';
import multer from 'multer';
import { analyzeKLineImage, isAIModelConfigured, getAIModelVersion } from '../services/analysis.js';
import { saveAnalysis } from '../services/storage.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    cb(null, `kline-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG and WebP are allowed.'));
    }
  },
});

// POST /api/analysis/analyze - Upload and analyze K-line image
router.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!isAIModelConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI model not configured',
        message: 'Please set OPENAI_API_KEY in environment variables',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image provided',
        message: 'Please upload a K-line chart image',
      });
    }

    // Convert image to base64
    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`;

    // Analyze with AI
    const signal = await analyzeKLineImage(imageBase64);
    
    // Save to storage
    signal.sourceImageUrl = `/uploads/${path.basename(imagePath)}`;
    saveAnalysis(signal);

    // Clean up uploaded file after analysis
    fs.unlink(imagePath, () => {});

    res.json({
      success: true,
      data: {
        signalId: signal.id,
        signal,
        processingTime: signal.processingTime,
        modelVersion: signal.modelVersion,
      },
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/analysis/status - Check AI service status
router.get('/status', (_req, res) => {
  res.json({
    success: true,
    data: {
      aiConfigured: isAIModelConfigured(),
      model: getAIModelVersion(),
    },
  });
});

export { router as analysisRouter };
