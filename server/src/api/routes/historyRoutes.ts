/**
 * VRVerse Player — History Routes
 */

import { Router } from 'express';
import { historyController } from '../controllers/historyController';

const router = Router();

// Get all history
router.get('/', historyController.getAll);

// Get downloads (completed conversions)
router.get('/downloads', historyController.getDownloads);

// Clear all history
router.delete('/clear', historyController.clearAll);

export default router;
