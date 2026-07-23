/**
 * VRVerse Player — Conversion Model
 * Data access layer for the conversions table.
 */

import { getDb } from '../database';
import { v4 as uuidv4 } from 'uuid';

export type VRMode = 'normal' | 'vr180' | 'vr360';
export type ConversionStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ProjectionType = 'perspective' | 'fisheye' | 'equirectangular' | 'hemisphere' | 'cubemap';
export type ProjectionQuality = 'low' | 'medium' | 'high' | 'ultra';
export type Resolution = '720p' | '1080p' | '1440p' | '4k';

export interface ConversionRecord {
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
  projectionQuality: ProjectionQuality;
  startedAt: string | null;
  completedAt: string | null;
  error: string;
  createdAt: string;
}

export interface CreateConversionInput {
  videoId: string;
  vrMode: VRMode;
  projectionType?: ProjectionType;
  outputResolution?: Resolution;
  outputFps?: number;
  outputBitrate?: string;
  projectionQuality?: ProjectionQuality;
}

export const ConversionModel = {
  /** Create a new conversion job record */
  create(input: CreateConversionInput): ConversionRecord {
    const db = getDb();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO conversions (id, videoId, vrMode, projectionType, outputResolution, outputFps, outputBitrate, projectionQuality)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.videoId,
      input.vrMode,
      input.projectionType || 'equirectangular',
      input.outputResolution || '1080p',
      input.outputFps || 30,
      input.outputBitrate || '5M',
      input.projectionQuality || 'high',
    );

    return this.getById(id)!;
  },

  /** Get a conversion by ID */
  getById(id: string): ConversionRecord | undefined {
    const db = getDb();
    return db.prepare('SELECT * FROM conversions WHERE id = ?').get(id) as ConversionRecord | undefined;
  },

  /** Get all conversions for a video */
  getByVideoId(videoId: string): ConversionRecord[] {
    const db = getDb();
    return db.prepare('SELECT * FROM conversions WHERE videoId = ? ORDER BY createdAt DESC')
      .all(videoId) as ConversionRecord[];
  },

  /** Get all conversions */
  getAll(): ConversionRecord[] {
    const db = getDb();
    return db.prepare('SELECT * FROM conversions ORDER BY createdAt DESC').all() as ConversionRecord[];
  },

  /** Update conversion progress */
  updateProgress(id: string, progress: number, currentStage: string, eta: number = 0): void {
    const db = getDb();
    db.prepare(`
      UPDATE conversions SET progress = ?, currentStage = ?, estimatedTimeRemaining = ? WHERE id = ?
    `).run(progress, currentStage, eta, id);
  },

  /** Mark conversion as processing */
  markProcessing(id: string): void {
    const db = getDb();
    db.prepare(`
      UPDATE conversions SET status = 'processing', startedAt = datetime('now') WHERE id = ?
    `).run(id);
  },

  /** Mark conversion as completed */
  markCompleted(id: string, outputPath: string): void {
    const db = getDb();
    db.prepare(`
      UPDATE conversions SET status = 'completed', progress = 100, outputPath = ?, completedAt = datetime('now'), currentStage = 'Done' WHERE id = ?
    `).run(outputPath, id);
  },

  /** Mark conversion as failed */
  markFailed(id: string, error: string): void {
    const db = getDb();
    db.prepare(`
      UPDATE conversions SET status = 'failed', error = ?, completedAt = datetime('now'), currentStage = 'Failed' WHERE id = ?
    `).run(error, id);
  },

  /** Mark conversion as cancelled */
  markCancelled(id: string): void {
    const db = getDb();
    db.prepare(`
      UPDATE conversions SET status = 'cancelled', completedAt = datetime('now'), currentStage = 'Cancelled' WHERE id = ?
    `).run(id);
  },

  /** Delete a conversion record */
  delete(id: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM conversions WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /** Get completed conversions (for downloads/history) */
  getCompleted(): ConversionRecord[] {
    const db = getDb();
    return db.prepare(
      "SELECT * FROM conversions WHERE status = 'completed' ORDER BY completedAt DESC"
    ).all() as ConversionRecord[];
  },
};
