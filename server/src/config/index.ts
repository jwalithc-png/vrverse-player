/**
 * VRVerse Player — Server Configuration
 * Centralized configuration for all server settings.
 * Adapted for system: Ryzen 5 5625U, 16GB RAM, integrated GPU.
 */

import path from 'path';

const BASE_DIR = process.env.VRVERSE_BASE_DIR || 'D:\\vrverse-player';

export const config = {
  /** Server port */
  port: parseInt(process.env.PORT || '3001', 10),

  /** Client origin for CORS */
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  /** File paths */
  paths: {
    uploads: path.join(BASE_DIR, 'uploads'),
    output: path.join(BASE_DIR, 'output'),
    temp: path.join(BASE_DIR, 'temp'),
    thumbnails: path.join(BASE_DIR, 'thumbnails'),
    database: path.join(BASE_DIR, 'data', 'vrverse.db'),
  },

  /** Upload constraints */
  upload: {
    maxFileSize: 2000 * 1024 * 1024, // 2GB (2000MB)
    allowedMimeTypes: [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/webm',
    ],
    allowedExtensions: ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
  },

  /** FFmpeg processing settings — optimized for 6-core/12-thread CPU */
  processing: {
    maxConcurrentJobs: 1,
    ffmpegThreads: 8,
    enableGpuAccel: false,
    defaultResolution: '1080p' as const,
    defaultFps: 30,
    defaultBitrate: '5M',
    defaultQuality: 'high' as const,
  },

  /** Resolution presets */
  resolutions: {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '1440p': { width: 2560, height: 1440 },
    '4k': { width: 3840, height: 2160 },
  } as Record<string, { width: number; height: number }>,

  /** VR projection settings */
  projection: {
    qualityPresets: {
      low: { segments: 32, detail: 1 },
      medium: { segments: 48, detail: 2 },
      high: { segments: 64, detail: 3 },
      ultra: { segments: 96, detail: 4 },
    },
  },
} as const;
