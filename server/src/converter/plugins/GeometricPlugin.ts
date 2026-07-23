/**
 * VRVerse Player — Geometric Conversion Plugin
 * Uses FFmpeg's v360 filter for geometric projection-based VR conversion.
 * This is the default plugin that requires no AI/ML dependencies.
 */

import ffmpeg from 'fluent-ffmpeg';
// @ts-ignore
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from '@ffprobe-installer/ffprobe';
import {
  ConversionPlugin,
  ConversionConfig,
  ConversionResult,
  ProgressCallback,
} from './PluginInterface';
import { logger } from '../../utils/logger';

// Ensure ffmpeg paths are set
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}
ffmpeg.setFfprobePath(ffprobePath.path);

export class GeometricPlugin implements ConversionPlugin {
  readonly name = 'geometric';
  readonly priority = 100; // Low priority — fallback/default
  readonly description = 'FFmpeg-based geometric projection (no AI required)';

  private currentProcess: ffmpeg.FfmpegCommand | null = null;
  private cancelled = false;

  canHandle(_config: ConversionConfig): boolean {
    // Geometric plugin can handle all VR modes
    return true;
  }

  async isAvailable(): Promise<boolean> {
    return true; // FFmpeg is always bundled
  }

  cancel(): void {
    this.cancelled = true;
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      logger.pipeline('Geometric', 'Conversion cancelled');
    }
  }

  async process(config: ConversionConfig, onProgress: ProgressCallback): Promise<ConversionResult> {
    this.cancelled = false;
    const startTime = Date.now();

    return new Promise((resolve) => {
      onProgress(0, 'Initializing FFmpeg');
      logger.pipeline('Geometric', `Starting ${config.vrMode} conversion`);
      logger.pipeline('Geometric', `Input: ${config.inputPath}`);
      logger.pipeline('Geometric', `Output: ${config.outputPath}`);
      logger.pipeline('Geometric', `Resolution: ${config.resolution.width}x${config.resolution.height}`);

      const videoFilters = this.buildVideoFilters(config);
      logger.pipeline('Geometric', `Filters: ${videoFilters.join(', ')}`);

      onProgress(5, 'Decoding video');

      const command = ffmpeg(config.inputPath)
        .videoFilters(videoFilters)
        .outputOptions([
          `-threads ${config.threads}`,
          '-c:v libx264',
          '-preset medium',
          `-b:v ${config.bitrate}`,
          '-c:a aac',
          '-b:a 192k',
          '-movflags +faststart',
          `-r ${config.fps}`,
          `-s ${config.resolution.width}x${config.resolution.height}`,
        ])
        .output(config.outputPath)
        .on('start', (cmd) => {
          logger.pipeline('Geometric', `FFmpeg command: ${cmd}`);
          onProgress(10, 'Processing frames');
        })
        .on('progress', (progress) => {
          if (this.cancelled) return;

          const percent = Math.min(95, Math.max(10, progress.percent || 10));
          const eta = progress.timemark
            ? this.parseTimemark(progress.timemark)
            : 0;

          let stage = 'Processing frames';
          if (percent > 80) stage = 'Encoding output';
          else if (percent > 50) stage = 'Mapping to sphere';
          else if (percent > 25) stage = 'Transforming frames';

          onProgress(percent, stage, eta);
        })
        .on('end', () => {
          if (this.cancelled) {
            resolve({
              success: false,
              outputPath: config.outputPath,
              duration: Date.now() - startTime,
              error: 'Cancelled',
            });
            return;
          }

          onProgress(100, 'Complete');
          logger.pipeline('Geometric', `Conversion complete in ${Date.now() - startTime}ms`);

          resolve({
            success: true,
            outputPath: config.outputPath,
            duration: Date.now() - startTime,
          });
        })
        .on('error', (err) => {
          logger.error(`Geometric conversion error: ${err.message}`);

          resolve({
            success: false,
            outputPath: config.outputPath,
            duration: Date.now() - startTime,
            error: err.message,
          });
        });

      this.currentProcess = command;
      command.run();
    });
  }

  /**
   * Build FFmpeg video filter chain based on VR mode and projection type.
   * Uses FFmpeg's v360 filter for equirectangular and hemispherical projections.
   */
  private buildVideoFilters(config: ConversionConfig): string[] {
    const filters: string[] = [];

    switch (config.vrMode) {
      case 'vr360':
        filters.push(this.build360Filter(config));
        break;

      case 'vr180':
        filters.push(this.build180Filter(config));
        break;

      case 'normal':
      default:
        // No VR filter for normal mode, just scale
        filters.push(`scale=${config.resolution.width}:${config.resolution.height}`);
        break;
    }

    return filters;
  }

  /**
   * Estimate the source video's field of view from its aspect ratio.
   * Standard flat camera footage typically covers ~60-90° horizontal FOV.
   * We use the aspect ratio to determine appropriate FOV values so the
   * video content is properly centered on the output projection.
   */
  private estimateSourceFov(config: ConversionConfig): { h_fov: number; v_fov: number } {
    // Most flat videos are shot with ~70-80° horizontal FOV
    // We use a moderate default that keeps the content centered and properly sized
    const aspectRatio = config.resolution.width / config.resolution.height;
    
    // Standard flat video: ~80° horizontal, vertical derived from aspect ratio
    const h_fov = 80;
    const v_fov = Math.round(h_fov / aspectRatio);
    
    return { h_fov, v_fov };
  }

  /** Build the v360 filter for full 360° equirectangular projection */
  private build360Filter(config: ConversionConfig): string {
    const w = config.resolution.width;
    const h = config.resolution.height;
    const { h_fov, v_fov } = this.estimateSourceFov(config);

    switch (config.projectionType) {
      case 'cubemap':
        return `v360=flat:c6x1:h_fov=${h_fov}:v_fov=${v_fov}:w=${w}:h=${h}`;

      case 'fisheye':
        return `v360=flat:fisheye:h_fov=${h_fov}:v_fov=${v_fov}:w=${w}:h=${h}`;

      case 'perspective':
        // Theater Mode: narrower slice for a "screen in front of you" effect
        return `v360=flat:equirect:h_fov=90:v_fov=50:w=${w}:h=${h}`;

      case 'equirectangular':
      default:
        // Full Immersive: Just scale the video — Three.js client handles
        // projection via partial sphere geometry (curved cinema screen)
        return `scale=${w}:${h}`;
    }
  }

  /** Build the v360 filter for 180° hemispherical projection */
  private build180Filter(config: ConversionConfig): string {
    const w = config.resolution.width;
    const h = config.resolution.height;
    const { h_fov, v_fov } = this.estimateSourceFov(config);

    switch (config.projectionType) {
      case 'fisheye':
        return `v360=flat:fisheye:h_fov=${h_fov}:v_fov=${v_fov}:w=${w}:h=${h}`;

      case 'hemisphere':
        return `v360=flat:hequirect:h_fov=${h_fov}:v_fov=${v_fov}:w=${w}:h=${h}`;

      case 'perspective':
        // Theater Mode for 180: narrower slice
        return `v360=flat:hequirect:h_fov=90:v_fov=50:w=${w}:h=${h}`;

      case 'equirectangular':
      default:
        // Full Immersive 180: Just scale the video — Three.js client handles
        // projection via partial sphere geometry (curved cinema screen)
        return `scale=${w}:${h}`;
    }
  }

  /** Parse FFmpeg timemark (HH:MM:SS.ms) to seconds */
  private parseTimemark(timemark: string): number {
    const parts = timemark.split(':');
    if (parts.length !== 3) return 0;
    return (
      parseInt(parts[0]) * 3600 +
      parseInt(parts[1]) * 60 +
      parseFloat(parts[2])
    );
  }
}
