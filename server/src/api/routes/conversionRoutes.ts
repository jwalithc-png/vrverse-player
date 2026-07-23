/**
 * VRVerse Player — Conversion Routes
 */

import { Router } from 'express';
import { conversionController } from '../controllers/conversionController';
import { requireId, requireBody, validateVRMode } from '../middleware/validation';

const router = Router();

// Start a new conversion
router.post('/start', requireBody('videoId', 'vrMode'), validateVRMode, conversionController.start);

// Get all conversions
router.get('/', conversionController.getAll);

// Get queue statistics
router.get('/queue/stats', conversionController.getQueueStats);

// Get available plugins
router.get('/plugins', conversionController.getPlugins);

// Get conversions for a video
router.get('/video/:videoId', conversionController.getByVideo);

// Get conversion status
router.get('/:id/status', requireId, conversionController.getStatus);

// Cancel a conversion
router.post('/:id/cancel', requireId, conversionController.cancel);

// Stream converted video
router.get('/:id/stream', requireId, conversionController.stream);

// Download converted video
router.get('/:id/download', requireId, conversionController.download);

// Delete a conversion
router.delete('/:id', requireId, conversionController.delete);

export default router;
