/**
 * VRVerse Player — Conversion Pipeline
 * Orchestrates the conversion process using registered plugins.
 * Implements the chain-of-responsibility pattern for plugin selection.
 */

import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ConversionPlugin,
  ConversionConfig,
  ConversionResult,
  ProgressCallback,
} from './plugins/PluginInterface';
import { GeometricPlugin } from './plugins/GeometricPlugin';
import { ConversionModel, type ConversionRecord } from '../db/models/Conversion';
import { VideoModel } from '../db/models/Video';
import { config } from '../config';
import { logger } from '../utils/logger';

/** Pipeline manages plugin registration and conversion execution */
export class Pipeline {
  private plugins: ConversionPlugin[] = [];
  private activeConversions: Map<string, ConversionPlugin> = new Map();

  constructor() {
    // Register the default geometric plugin
    this.registerPlugin(new GeometricPlugin());
    logger.info(`Pipeline initialized with ${this.plugins.length} plugin(s)`);
  }

  /**
   * Register a conversion plugin.
   * Plugins are sorted by priority (lower = higher priority).
   * Future AI plugins can be registered here.
   */
  registerPlugin(plugin: ConversionPlugin): void {
    this.plugins.push(plugin);
    this.plugins.sort((a, b) => a.priority - b.priority);
    logger.info(`Plugin registered: ${plugin.name} (priority: ${plugin.priority})`);
  }

  /** Get all registered plugins */
  getPlugins(): { name: string; priority: number; description: string }[] {
    return this.plugins.map(p => ({
      name: p.name,
      priority: p.priority,
      description: p.description,
    }));
  }

  /**
   * Start a conversion job.
   * Selects the appropriate plugin and processes the video.
   */
  async startConversion(
    conversionId: string,
    onProgress?: ProgressCallback
  ): Promise<ConversionResult> {
    const conversion = ConversionModel.getById(conversionId);
    if (!conversion) {
      throw new Error(`Conversion not found: ${conversionId}`);
    }

    const video = VideoModel.getById(conversion.videoId);
    if (!video) {
      throw new Error(`Video not found: ${conversion.videoId}`);
    }

    // Build output filename
    const outputFilename = `${path.basename(video.filename, path.extname(video.filename))}_${conversion.vrMode}_${uuidv4().slice(0, 8)}.mp4`;
    const outputPath = path.join(config.paths.output, outputFilename);

    // Resolve resolution
    const resolution = config.resolutions[conversion.outputResolution] || config.resolutions['1080p'];

    // Build config
    const convConfig: ConversionConfig = {
      inputPath: video.filePath,
      outputPath,
      vrMode: conversion.vrMode,
      resolution,
      fps: conversion.outputFps,
      bitrate: conversion.outputBitrate,
      quality: conversion.projectionQuality as any,
      threads: config.processing.ffmpegThreads,
      projectionType: conversion.projectionType,
    };

    // Find the first plugin that can handle this config
    const plugin = await this.findPlugin(convConfig);
    if (!plugin) {
      ConversionModel.markFailed(conversionId, 'No plugin available for this conversion');
      return {
        success: false,
        outputPath,
        duration: 0,
        error: 'No compatible conversion plugin found',
      };
    }

    // Track the active conversion for cancellation
    this.activeConversions.set(conversionId, plugin);

    // Mark as processing
    ConversionModel.markProcessing(conversionId);

    // Create progress callback that updates DB and notifies caller
    const progressCb: ProgressCallback = (progress, stage, eta) => {
      ConversionModel.updateProgress(conversionId, progress, stage, eta || 0);
      onProgress?.(progress, stage, eta);
    };

    logger.pipeline('Pipeline', `Using plugin: ${plugin.name} for ${conversion.vrMode}`);

    try {
      const result = await plugin.process(convConfig, progressCb);

      if (result.success) {
        ConversionModel.markCompleted(conversionId, outputPath);
        logger.success(`Conversion ${conversionId} completed in ${result.duration}ms`);
      } else {
        ConversionModel.markFailed(conversionId, result.error || 'Unknown error');
        logger.error(`Conversion ${conversionId} failed: ${result.error}`);
      }

      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Unexpected error';
      ConversionModel.markFailed(conversionId, errorMsg);
      logger.error(`Conversion ${conversionId} error: ${errorMsg}`);
      return {
        success: false,
        outputPath,
        duration: 0,
        error: errorMsg,
      };
    } finally {
      this.activeConversions.delete(conversionId);
    }
  }

  /** Cancel a running conversion */
  cancelConversion(conversionId: string): boolean {
    const plugin = this.activeConversions.get(conversionId);
    if (plugin) {
      plugin.cancel();
      ConversionModel.markCancelled(conversionId);
      this.activeConversions.delete(conversionId);
      logger.info(`Conversion ${conversionId} cancelled`);
      return true;
    }
    return false;
  }

  /** Check if a conversion is currently active */
  isActive(conversionId: string): boolean {
    return this.activeConversions.has(conversionId);
  }

  /** Find the first available plugin that can handle the config */
  private async findPlugin(config: ConversionConfig): Promise<ConversionPlugin | null> {
    for (const plugin of this.plugins) {
      if (plugin.canHandle(config) && await plugin.isAvailable()) {
        return plugin;
      }
    }
    return null;
  }
}

/** Singleton pipeline instance */
export const pipeline = new Pipeline();
