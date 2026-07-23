/**
 * VRVerse Player — Settings Routes
 */

import { Router } from 'express';
import { settingsController } from '../controllers/settingsController';

const router = Router();

// Get all settings
router.get('/', settingsController.getAll);

// Get a specific setting
router.get('/:key', settingsController.get);

// Update a setting
router.put('/', settingsController.update);

// Bulk update settings
router.put('/bulk', settingsController.updateMany);

export default router;
