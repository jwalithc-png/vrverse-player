/**
 * VRVerse Player — Settings Controller
 * Handles reading and updating application settings.
 */

import { Request, Response } from 'express';
import { SettingsModel } from '../../db/models/Settings';
import { logger } from '../../utils/logger';

export const settingsController = {
  /** Get all settings */
  getAll(_req: Request, res: Response): void {
    const settings = SettingsModel.getAll();
    res.json({ settings });
  },

  /** Get a specific setting */
  get(req: Request, res: Response): void {
    const value = SettingsModel.get(req.params.key);
    if (value === undefined) {
      res.status(404).json({ error: 'Setting not found' });
      return;
    }
    res.json({ key: req.params.key, value });
  },

  /** Update a setting */
  update(req: Request, res: Response): void {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      res.status(400).json({ error: 'Key and value are required' });
      return;
    }

    SettingsModel.set(key, String(value));
    logger.info(`Setting updated: ${key} = ${value}`);
    res.json({ success: true, key, value: String(value) });
  },

  /** Bulk update settings */
  updateMany(req: Request, res: Response): void {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: 'Settings object is required' });
      return;
    }

    SettingsModel.updateMany(settings);
    logger.info(`Settings bulk updated: ${Object.keys(settings).length} keys`);
    res.json({ success: true, updated: Object.keys(settings).length });
  },
};
