/**
 * VRVerse Player — Conversion Controller
 * Handles VR conversion job management.
 */

import { Request, Response } from 'express';
import { ConversionModel } from '../../db/models/Conversion';
import { VideoModel } from '../../db/models/Video';
import { pipeline } from '../../converter/Pipeline';
import { JobQueue } from '../../queue/JobQueue';
import { logger } from '../../utils/logger';
import { config } from '../../config';

/** Conversion job data */
interface ConversionJobData {
  conversionId: string;
}

/** Conversion job queue — singleton */
const conversionQueue = new JobQueue<ConversionJobData>(
  'video-conversion',
  config.processing.maxConcurrentJobs
);

// Set up the queue processor
conversionQueue.process(async (job) => {
  const { conversionId } = job.data;

  const result = await pipeline.startConversion(conversionId, (progress, _stage) => {
    conversionQueue.updateProgress(job.id, progress);
  });

  if (!result.success) {
    throw new Error(result.error || 'Conversion failed');
  }

  return result;
});

/** Socket.IO instance — will be set by the app */
let io: any = null;

export function setSocketIO(socketIO: any): void {
  io = socketIO;

  // Listen for queue events and broadcast via Socket.IO
  conversionQueue.on('completed', (job) => {
    io?.emit('conversion:completed', { jobId: job.id, conversionId: job.data.conversionId });
  });

  conversionQueue.on('failed', (job) => {
    io?.emit('conversion:failed', { jobId: job.id, conversionId: job.data.conversionId, error: job.error });
  });
}

export const conversionController = {
  /** Start a new conversion */
  async start(req: Request, res: Response): Promise<void> {
    try {
      const {
        videoId,
        vrMode,
        projectionType,
        outputResolution,
        outputFps,
        outputBitrate,
        projectionQuality,
      } = req.body;

      // Validate video exists
      const video = VideoModel.getById(videoId);
      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      // Create conversion record
      const conversion = ConversionModel.create({
        videoId,
        vrMode,
        projectionType: projectionType || 'equirectangular',
        outputResolution: outputResolution || config.processing.defaultResolution,
        outputFps: outputFps || config.processing.defaultFps,
        outputBitrate: outputBitrate || config.processing.defaultBitrate,
        projectionQuality: projectionQuality || config.processing.defaultQuality,
      });

      // Add to queue
      conversionQueue.add(conversion.id, { conversionId: conversion.id });

      logger.info(`Conversion queued: ${conversion.id} (${vrMode})`);

      res.status(201).json({
        success: true,
        conversion,
        queuePosition: conversionQueue.getStats().waiting,
      });
    } catch (err: any) {
      logger.error(`Start conversion error: ${err.message}`);
      res.status(500).json({ error: 'Failed to start conversion', message: err.message });
    }
  },

  /** Get conversion status */
  getStatus(req: Request, res: Response): void {
    const conversion = ConversionModel.getById(req.params.id);
    if (!conversion) {
      res.status(404).json({ error: 'Conversion not found' });
      return;
    }

    const queueJob = conversionQueue.getJob(req.params.id);

    res.json({
      conversion,
      queueStatus: queueJob?.status || 'unknown',
      queueStats: conversionQueue.getStats(),
    });
  },

  /** Cancel a conversion */
  cancel(req: Request, res: Response): void {
    const conversionId = req.params.id;

    // Cancel in pipeline (stops FFmpeg)
    const pipelineCancelled = pipeline.cancelConversion(conversionId);

    // Cancel in queue
    const queueCancelled = conversionQueue.cancel(conversionId);

    if (!pipelineCancelled && !queueCancelled) {
      // Might still be in DB
      const conversion = ConversionModel.getById(conversionId);
      if (conversion && conversion.status !== 'completed' && conversion.status !== 'failed') {
        ConversionModel.markCancelled(conversionId);
      }
    }

    res.json({ success: true, message: 'Conversion cancelled' });
  },

  /** Get all conversions */
  getAll(_req: Request, res: Response): void {
    const conversions = ConversionModel.getAll();
    res.json({ conversions });
  },

  /** Get conversions for a specific video */
  getByVideo(req: Request, res: Response): void {
    const conversions = ConversionModel.getByVideoId(req.params.videoId);
    res.json({ conversions });
  },

  /** Delete a conversion record */
  delete(req: Request, res: Response): void {
    const conversion = ConversionModel.getById(req.params.id);
    if (!conversion) {
      res.status(404).json({ error: 'Conversion not found' });
      return;
    }

    // Delete output file if exists
    if (conversion.outputPath) {
      const fs = require('fs');
      if (fs.existsSync(conversion.outputPath)) {
        fs.unlinkSync(conversion.outputPath);
      }
    }

    ConversionModel.delete(req.params.id);
    res.json({ success: true, message: 'Conversion deleted' });
  },

  /** Stream converted video */
  stream(req: Request, res: Response): void {
    logger.info(`Stream requested for conversion: ${req.params.id}`);
    const conversion = ConversionModel.getById(req.params.id);
    if (!conversion || !conversion.outputPath) {
      logger.error(`Stream error: Conversion ${req.params.id} or outputPath not found`);
      res.status(404).json({ error: 'Converted video not found' });
      return;
    }

    const fs = require('fs');
    if (!fs.existsSync(conversion.outputPath)) {
      logger.error(`Stream error: Converted file not found on disk at ${conversion.outputPath}`);
      res.status(404).json({ error: 'Output file not found on disk' });
      return;
    }

    const stat = fs.statSync(conversion.outputPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = fs.createReadStream(conversion.outputPath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });
      fs.createReadStream(conversion.outputPath).pipe(res);
    }
  },

  /** Download converted video */
  download(req: Request, res: Response): void {
    const conversion = ConversionModel.getById(req.params.id);
    if (!conversion || !conversion.outputPath) {
      res.status(404).json({ error: 'Converted video not found' });
      return;
    }

    const fs = require('fs');
    const path = require('path');
    if (!fs.existsSync(conversion.outputPath)) {
      res.status(404).json({ error: 'Output file not found on disk' });
      return;
    }

    const filename = path.basename(conversion.outputPath);
    res.download(conversion.outputPath, filename);
  },

  /** Get available plugins */
  getPlugins(_req: Request, res: Response): void {
    res.json({ plugins: pipeline.getPlugins() });
  },

  /** Get queue statistics */
  getQueueStats(_req: Request, res: Response): void {
    res.json(conversionQueue.getStats());
  },
};
