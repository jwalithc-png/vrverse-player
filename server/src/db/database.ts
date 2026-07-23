/**
 * VRVerse Player — SQLite Database
 * Initializes the database and runs migrations.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';

let db: Database.Database;

/** Initialize the SQLite database and run migrations */
export function initDatabase(): Database.Database {
  const dbDir = path.dirname(config.paths.database);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(config.paths.database);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);
  logger.success('Database initialized');
  return db;
}

/** Get the database instance */
export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/** Run all migrations */
function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      originalName TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      size INTEGER NOT NULL,
      duration REAL DEFAULT 0,
      width INTEGER DEFAULT 0,
      height INTEGER DEFAULT 0,
      fps REAL DEFAULT 0,
      codec TEXT DEFAULT '',
      bitrate INTEGER DEFAULT 0,
      thumbnailPath TEXT DEFAULT '',
      filePath TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversions (
      id TEXT PRIMARY KEY,
      videoId TEXT NOT NULL,
      vrMode TEXT NOT NULL CHECK (vrMode IN ('normal', 'vr180', 'vr360')),
      projectionType TEXT DEFAULT 'equirectangular',
      status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
      progress REAL DEFAULT 0,
      currentStage TEXT DEFAULT '',
      estimatedTimeRemaining REAL DEFAULT 0,
      outputPath TEXT DEFAULT '',
      outputResolution TEXT DEFAULT '1080p',
      outputFps INTEGER DEFAULT 30,
      outputBitrate TEXT DEFAULT '5M',
      projectionQuality TEXT DEFAULT 'high',
      startedAt TEXT,
      completedAt TEXT,
      error TEXT DEFAULT '',
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_conversions_videoId ON conversions(videoId);
    CREATE INDEX IF NOT EXISTS idx_conversions_status ON conversions(status);
  `);

  // Insert default settings if not exist
  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  );

  const defaults: Record<string, string> = {
    defaultResolution: '1080p',
    defaultFps: '30',
    defaultBitrate: '5M',
    defaultQuality: 'high',
    theme: 'dark',
    maxUploadSize: String(config.upload.maxFileSize),
  };

  const insertMany = db.transaction(() => {
    for (const [key, value] of Object.entries(defaults)) {
      insertSetting.run(key, value);
    }
  });

  insertMany();
  logger.info('Migrations complete');
}

/** Close the database connection */
export function closeDatabase(): void {
  if (db) {
    db.close();
    logger.info('Database closed');
  }
}
