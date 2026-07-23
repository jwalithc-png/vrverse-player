/**
 * VRVerse Player — Video Routes
 */

import { Router } from 'express';
import { videoController } from '../controllers/videoController';
import { upload } from '../middleware/upload';
import { requireId } from '../middleware/validation';

const router = Router();

// Upload a video
router.post('/upload', upload.single('video'), videoController.upload);

// Get all videos
router.get('/', videoController.getAll);

// Get a specific video
router.get('/:id', requireId, videoController.getById);

// Stream a video
router.get('/:id/stream', requireId, videoController.stream);

// Get video thumbnail
router.get('/:id/thumbnail', requireId, videoController.thumbnail);

// Delete a video
router.delete('/:id', requireId, videoController.delete);

// Rename a video
router.patch('/:id/rename', requireId, videoController.rename);

export default router;
