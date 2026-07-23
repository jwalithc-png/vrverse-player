/**
 * VRVerse Player — Settings Model
 * Key-value settings persistence.
 */

import { getDb } from '../database';

export interface SettingRecord {
  key: string;
  value: string;
  updatedAt: string;
}

export const SettingsModel = {
  /** Get a setting by key */
  get(key: string): string | undefined {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value;
  },

  /** Set a setting value */
  set(key: string, value: string): void {
    const db = getDb();
    db.prepare(`
      INSERT INTO settings (key, value, updatedAt)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = ?, updatedAt = datetime('now')
    `).run(key, value, value);
  },

  /** Get all settings as a key-value map */
  getAll(): Record<string, string> {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all() as SettingRecord[];
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  },

  /** Delete a setting */
  delete(key: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM settings WHERE key = ?').run(key);
    return result.changes > 0;
  },

  /** Bulk update settings */
  updateMany(settings: Record<string, string>): void {
    const db = getDb();
    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = ?, updatedAt = datetime('now')
    `);

    const transaction = db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        upsert.run(key, value, value);
      }
    });

    transaction();
  },
};
