/**
 * VRVerse Player — History Controller
 * Manages conversion history with search, rename, share functionality.
 */

import { Request, Response } from 'express';
import { ConversionModel } from '../../db/models/Conversion';
import { VideoModel } from '../../db/models/Video';

export const historyController = {
  /** Get full history — completed and failed conversions with video details */
  getAll(_req: Request, res: Response): void {
    const conversions = ConversionModel.getAll();
    const history = conversions.map(conv => {
      const video = VideoModel.getById(conv.videoId);
      return {
        ...conv,
        video: video ? {
          id: video.id,
          originalName: video.originalName,
          duration: video.duration,
          width: video.width,
          height: video.height,
          thumbnailPath: video.thumbnailPath ? `/api/videos/${video.id}/thumbnail` : null,
        } : null,
      };
    });

    res.json({ history });
  },

  /** Get completed downloads */
  getDownloads(_req: Request, res: Response): void {
    const completed = ConversionModel.getCompleted();
    const downloads = completed.map(conv => {
      const video = VideoModel.getById(conv.videoId);
      return {
        ...conv,
        video: video ? {
          id: video.id,
          originalName: video.originalName,
          thumbnailPath: video.thumbnailPath ? `/api/videos/${video.id}/thumbnail` : null,
        } : null,
      };
    });

    res.json({ downloads });
  },

  /** Clear all history */
  clearAll(_req: Request, res: Response): void {
    const conversions = ConversionModel.getAll();
    const fs = require('fs');

    for (const conv of conversions) {
      if (conv.outputPath && fs.existsSync(conv.outputPath)) {
        fs.unlinkSync(conv.outputPath);
      }
      ConversionModel.delete(conv.id);
    }

    res.json({ success: true, message: 'History cleared' });
  },
};
