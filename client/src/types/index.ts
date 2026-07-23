/**
 * VRVerse Player — Type Definitions
 */

export interface Video {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: number;
  thumbnailPath: string;
  filePath: string;
  createdAt: string;
  updatedAt: string;
}

export type VRMode = 'normal' | 'vr180' | 'vr360';
export type ConversionStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ProjectionType = 'perspective' | 'fisheye' | 'equirectangular' | 'hemisphere' | 'cubemap';
export type Resolution = '720p' | '1080p' | '1440p' | '4k';
export type Quality = 'low' | 'medium' | 'high' | 'ultra';

export interface Conversion {
  id: string;
  videoId: string;
  vrMode: VRMode;
  projectionType: ProjectionType;
  status: ConversionStatus;
  progress: number;
  currentStage: string;
  estimatedTimeRemaining: number;
  outputPath: string;
  outputResolution: Resolution;
  outputFps: number;
  outputBitrate: string;
  projectionQuality: Quality;
  startedAt: string | null;
  completedAt: string | null;
  error: string;
  createdAt: string;
}

export interface ConversionSettings {
  outputResolution: Resolution;
  outputFps: number;
  outputBitrate: string;
  projectionQuality: Quality;
  projectionType: ProjectionType;
}

export interface HistoryItem {
  id: string;
  videoId: string;
  vrMode: VRMode;
  status: ConversionStatus;
  progress: number;
  createdAt: string;
  completedAt: string | null;
  video: {
    id: string;
    originalName: string;
    duration: number;
    width: number;
    height: number;
    thumbnailPath: string | null;
  } | null;
}

export interface AppSettings {
  defaultResolution: Resolution;
  defaultFps: string;
  defaultBitrate: string;
  defaultQuality: Quality;
  theme: 'dark' | 'light';
  maxUploadSize: string;
}
