/**
 * VRVerse Player — Video Controller
 * Handles video upload, listing, streaming, and management.
 */

import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { VideoModel } from '../../db/models/Video';
import { getVideoMetadata, generateThumbnail } from '../../utils/ffmpegHelper';
import { safeDelete } from '../../utils/fileUtils';
import { logger } from '../../utils/logger';

export const videoController = {
  /** Upload a video file */
  async upload(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const file = req.file;
      logger.info(`Video uploaded: ${file.originalname} (${file.size} bytes)`);

      // Create initial record
      const video = VideoModel.create({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        filePath: file.path,
      });

      // Extract metadata asynchronously
      try {
        const metadata = await getVideoMetadata(file.path);
        VideoModel.updateMetadata(video.id, {
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          fps: metadata.fps,
          codec: metadata.codec,
          bitrate: metadata.bitrate,
        });
        logger.info(`Metadata extracted: ${metadata.width}x${metadata.height}, ${metadata.duration}s`);
      } catch (err) {
        logger.warn(`Metadata extraction failed: ${err}`);
      }

      // Generate thumbnail asynchronously
      try {
        const thumbName = `thumb_${video.id}.jpg`;
        const thumbPath = await generateThumbnail(file.path, thumbName);
        VideoModel.updateMetadata(video.id, { thumbnailPath: thumbPath });
      } catch (err) {
        logger.warn(`Thumbnail generation failed: ${err}`);
      }

      // Return the updated video record
      const updatedVideo = VideoModel.getById(video.id);
      res.status(201).json({ success: true, video: updatedVideo });
    } catch (err: any) {
      logger.error(`Upload error: ${err.message}`);
      res.status(500).json({ error: 'Upload failed', message: err.message });
    }
  },

  /** Get all videos */
  getAll(_req: Request, res: Response): void {
    const videos = VideoModel.getAll();
    res.json({ videos });
  },

  /** Get a video by ID */
  getById(req: Request, res: Response): void {
    const id = req.params.id as string;
    const video = VideoModel.getById(id);
    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }
    res.json({ video });
  },

  /** Stream a video file (supports range requests for seeking) */
  stream(req: Request, res: Response): void {
    const id = req.params.id as string;
    logger.info(`Stream requested for video: ${id}`);
    const video = VideoModel.getById(id);
    if (!video) {
      logger.error(`Stream error: Video ${id} not found in database`);
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    const filePath = video.filePath;
    if (!fs.existsSync(filePath)) {
      logger.error(`Stream error: File not found on disk at ${filePath}`);
      res.status(404).json({ error: 'Video file not found on disk' });
      return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Range request for video seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': video.mimeType || 'video/mp4',
      });
      stream.pipe(res);
    } else {
      // Full file request
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': video.mimeType || 'video/mp4',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  },

  /** Delete a video */
  delete(req: Request, res: Response): void {
    const id = req.params.id as string;
    const video = VideoModel.getById(id);
    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    // Delete files
    safeDelete(video.filePath);
    if (video.thumbnailPath) safeDelete(video.thumbnailPath);

    // Delete record
    VideoModel.delete(id);
    res.json({ success: true, message: 'Video deleted' });
  },

  /** Rename a video */
  rename(req: Request, res: Response): void {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const id = req.params.id as string;
    const video = VideoModel.getById(id);
    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    VideoModel.rename(id, name);
    res.json({ success: true, message: 'Video renamed' });
  },

  /** Serve a thumbnail image */
  thumbnail(req: Request, res: Response): void {
    const id = req.params.id as string;
    const video = VideoModel.getById(id);
    if (!video || !video.thumbnailPath) {
      res.status(404).json({ error: 'Thumbnail not found' });
      return;
    }

    if (!fs.existsSync(video.thumbnailPath)) {
      res.status(404).json({ error: 'Thumbnail file not found' });
      return;
    }

    res.sendFile(path.resolve(video.thumbnailPath));
  },
};
