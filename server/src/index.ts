/**
 * VRVerse Player — Server Entry Point
 * Initializes database, ensures directories, and starts the Express server.
 */

import { createApp } from './app';
import { initDatabase, closeDatabase } from './db/database';
import { ensureDirectories, cleanTemp } from './utils/fileUtils';
import { config } from './config';
import { logger } from './utils/logger';

async function main() {
  logger.info('═══════════════════════════════════════');
  logger.info('  VRVerse Player — Server Starting');
  logger.info('═══════════════════════════════════════');

  // Ensure all directories exist
  ensureDirectories();
  logger.success('Directories ready');

  // Initialize database
  initDatabase();

  // Clean temp directory on startup
  cleanTemp();

  // Create and start the Express app
  const { httpServer } = createApp();

  httpServer.listen(config.port, () => {
    logger.success(`Server running on http://localhost:${config.port}`);
    logger.info(`Client origin: ${config.clientOrigin}`);
    logger.info(`Uploads: ${config.paths.uploads}`);
    logger.info(`Output: ${config.paths.output}`);
    logger.info(`Max upload: ${config.upload.maxFileSize / 1024 / 1024}MB`);
    logger.info(`FFmpeg threads: ${config.processing.ffmpegThreads}`);
    logger.info(`Concurrent jobs: ${config.processing.maxConcurrentJobs}`);
    logger.info('═══════════════════════════════════════');
  });

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down...');
    closeDatabase();
    httpServer.close(() => {
      logger.info('Server stopped');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});
