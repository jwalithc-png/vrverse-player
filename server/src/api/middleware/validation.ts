/**
 * VRVerse Player — Validation Middleware
 * Request validation helpers.
 */

import { Request, Response, NextFunction } from 'express';

/** Validate that required body fields exist */
export function requireBody(...fields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = fields.filter(f => req.body[f] === undefined || req.body[f] === null);
    if (missing.length > 0) {
      res.status(400).json({
        error: 'Missing required fields',
        fields: missing,
      });
      return;
    }
    next();
  };
}

/** Validate that the ID parameter is present */
export function requireId(req: Request, res: Response, next: NextFunction): void {
  if (!req.params.id) {
    res.status(400).json({ error: 'Missing ID parameter' });
    return;
  }
  next();
}

/** Validate VR mode */
export function validateVRMode(req: Request, res: Response, next: NextFunction): void {
  const validModes = ['normal', 'vr180', 'vr360'];
  if (!validModes.includes(req.body.vrMode)) {
    res.status(400).json({
      error: 'Invalid VR mode',
      message: `Must be one of: ${validModes.join(', ')}`,
    });
    return;
  }
  next();
}
