/**
 * VRVerse Player — File Utilities
 * File system helpers for creating directories, cleaning temp files, etc.
 */

import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from './logger';

/** Ensure all required directories exist */
export function ensureDirectories(): void {
  const dirs = [
    config.paths.uploads,
    config.paths.output,
    config.paths.temp,
    config.paths.thumbnails,
    path.dirname(config.paths.database),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  }
}

/** Get file extension from filename */
export function getExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

/** Generate a unique filename with timestamp */
export function generateFilename(originalName: string, prefix = ''): string {
  const ext = getExtension(originalName);
  const base = path.basename(originalName, ext);
  const timestamp = Date.now();
  const safeName = base.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${prefix}${safeName}_${timestamp}${ext}`;
}

/** Delete a file safely (no error if missing) */
export function safeDelete(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (err) {
    logger.warn(`Failed to delete file: ${filePath}`, err);
  }
  return false;
}

/** Get file size in bytes */
export function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/** Format bytes to human readable */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Clean temp directory (remove files older than maxAge ms) */
export function cleanTemp(maxAgeMs = 3600000): void {
  const tempDir = config.paths.temp;
  if (!fs.existsSync(tempDir)) return;

  const now = Date.now();
  const files = fs.readdirSync(tempDir);

  for (const file of files) {
    const filePath = path.join(tempDir, file);
    try {
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        logger.debug(`Cleaned temp file: ${file}`);
      }
    } catch {
      // ignore
    }
  }
}
