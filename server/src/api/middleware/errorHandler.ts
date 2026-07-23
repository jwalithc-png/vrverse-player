/**
 * VRVerse Player — Error Handler Middleware
 * Centralized error handling for Express routes.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

/** Global error handler */
export function errorHandler(
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Multer file size error
  if ((err as any).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      error: 'File too large',
      message: 'Maximum file size is 500MB',
    });
    return;
  }

  // Multer filter error
  if (err.message?.includes('Unsupported file type')) {
    res.status(400).json({
      error: 'Invalid file type',
      message: err.message,
    });
    return;
  }

  // Known API error
  if ('status' in err) {
    res.status((err as ApiError).status).json({
      error: err.message,
      details: (err as ApiError).details,
    });
    return;
  }

  // Unknown error
  logger.error(`Unhandled error: ${err.message}`, err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
}
