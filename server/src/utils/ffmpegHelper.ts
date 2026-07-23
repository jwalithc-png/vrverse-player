/**
 * VRVerse Player — FFmpeg Helper
 * Configures fluent-ffmpeg with static binary paths and provides
 * utility functions for video metadata extraction and thumbnail generation.
 */

import ffmpeg from 'fluent-ffmpeg';
// @ts-ignore
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from '@ffprobe-installer/ffprobe';
import path from 'path';
import { config } from '../config';
import { logger } from './logger';

// Set FFmpeg binary paths from static installers
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}
ffmpeg.setFfprobePath(ffprobePath.path);

logger.info(`FFmpeg: ${ffmpegPath}`);
logger.info(`FFprobe: ${ffprobePath.path}`);

/** Video metadata extracted via FFprobe */
export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: number;
  size: number;
  format: string;
}

/** Extract metadata from a video file */
export function getVideoMetadata(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) {
        logger.error(`FFprobe error: ${err.message}`);
        return reject(err);
      }

      const videoStream = data.streams.find(s => s.codec_type === 'video');
      if (!videoStream) {
        return reject(new Error('No video stream found'));
      }

      // Parse FPS from r_frame_rate (e.g., "30000/1001" or "30/1")
      let fps = 30;
      if (videoStream.r_frame_rate) {
        const parts = videoStream.r_frame_rate.split('/');
        fps = parts.length === 2
          ? Math.round(parseInt(parts[0]) / parseInt(parts[1]))
          : parseInt(parts[0]);
      }

      resolve({
        duration: typeof data.format.duration === 'number' ? data.format.duration : parseFloat(String(data.format.duration || 0)),
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        fps,
        codec: videoStream.codec_name || 'unknown',
        bitrate: typeof data.format.bit_rate === 'number' ? data.format.bit_rate : parseInt(String(data.format.bit_rate || 0)),
        size: typeof data.format.size === 'number' ? data.format.size : parseInt(String(data.format.size || 0)),
        format: data.format.format_name || 'unknown',
      });
    });
  });
}

/** Generate a thumbnail from a video file */
export function generateThumbnail(
  videoPath: string,
  outputFilename: string
): Promise<string> {
  const thumbnailPath = path.join(config.paths.thumbnails, outputFilename);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['10%'],
        filename: outputFilename,
        folder: config.paths.thumbnails,
        size: '320x180',
      })
      .on('end', () => {
        logger.success(`Thumbnail generated: ${outputFilename}`);
        resolve(thumbnailPath);
      })
      .on('error', (err) => {
        logger.error(`Thumbnail error: ${err.message}`);
        reject(err);
      });
  });
}

/** Create an FFmpeg command with standard options */
export function createFfmpegCommand(inputPath: string): ffmpeg.FfmpegCommand {
  return ffmpeg(inputPath)
    .outputOptions([`-threads ${config.processing.ffmpegThreads}`]);
}

export { ffmpeg };
