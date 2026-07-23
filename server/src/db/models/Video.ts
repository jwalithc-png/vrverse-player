/**
 * VRVerse Player — Video Model
 * Data access layer for the videos table.
 */

import { getDb } from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface VideoRecord {
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

export interface CreateVideoInput {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  filePath: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  codec?: string;
  bitrate?: number;
  thumbnailPath?: string;
}

export const VideoModel = {
  /** Create a new video record */
  create(input: CreateVideoInput): VideoRecord {
    const db = getDb();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO videos (id, filename, originalName, mimeType, size, duration, width, height, fps, codec, bitrate, thumbnailPath, filePath)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.filename,
      input.originalName,
      input.mimeType,
      input.size,
      input.duration || 0,
      input.width || 0,
      input.height || 0,
      input.fps || 0,
      input.codec || '',
      input.bitrate || 0,
      input.thumbnailPath || '',
      input.filePath,
    );

    return this.getById(id)!;
  },

  /** Get a video by ID */
  getById(id: string): VideoRecord | undefined {
    const db = getDb();
    return db.prepare('SELECT * FROM videos WHERE id = ?').get(id) as VideoRecord | undefined;
  },

  /** Get all videos, sorted by creation date */
  getAll(): VideoRecord[] {
    const db = getDb();
    return db.prepare('SELECT * FROM videos ORDER BY createdAt DESC').all() as VideoRecord[];
  },

  /** Update video metadata (e.g., after FFprobe analysis) */
  updateMetadata(id: string, meta: Partial<VideoRecord>): void {
    const db = getDb();
    const sets: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(meta)) {
      if (key !== 'id' && key !== 'createdAt') {
        sets.push(`${key} = ?`);
        values.push(value);
      }
    }

    sets.push("updatedAt = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE videos SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  },

  /** Delete a video record */
  delete(id: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM videos WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /** Rename a video */
  rename(id: string, newName: string): void {
    const db = getDb();
    db.prepare("UPDATE videos SET originalName = ?, updatedAt = datetime('now') WHERE id = ?").run(newName, id);
  },
};
