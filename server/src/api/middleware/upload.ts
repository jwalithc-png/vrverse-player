/**
 * VRVerse Player — Upload Middleware
 * Multer configuration for handling video file uploads.
 */

import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import { Request } from 'express';

/** Storage configuration — saves to uploads directory with unique names */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.paths.uploads);
  },
  filename: (_req, file, cb) => {
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext) {
      // Map common video MIME types to extensions if missing
      const mimeMap: Record<string, string> = {
        'video/mp4': '.mp4',
        'video/quicktime': '.mov',
        'video/x-msvideo': '.avi',
        'video/x-matroska': '.mkv',
        'video/webm': '.webm',
      };
      ext = mimeMap[file.mimetype] || '.mp4'; // Default to .mp4 if unknown
    }
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

/** File filter — only allow supported video formats */
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isAllowedExt = config.upload.allowedExtensions.includes(ext);
  const isAllowedMime = config.upload.allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('video/');

  if (isAllowedExt || isAllowedMime) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext || 'no extension'} (MIME: ${file.mimetype}). Allowed: ${config.upload.allowedExtensions.join(', ')}`));
  }
};

/** Configured multer instance */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});
