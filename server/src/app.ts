/**
 * VRVerse Player — Express Application Setup
 * Configures Express with CORS, JSON parsing, routes, and Socket.IO.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { config } from './config';
import videoRoutes from './api/routes/videoRoutes';
import conversionRoutes from './api/routes/conversionRoutes';
import settingsRoutes from './api/routes/settingsRoutes';
import historyRoutes from './api/routes/historyRoutes';
import { errorHandler } from './api/middleware/errorHandler';
import { setSocketIO } from './api/controllers/conversionController';
import { logger } from './utils/logger';

export function createApp() {
  const app = express();
  const httpServer = createServer(app);

  const isLocalOrigin = (origin: string | undefined): boolean => {
    if (!origin || origin === 'null') return true;
    // Support localhost, 127.0.0.1, and all RFC 1918 private subnets:
    // - 10.0.0.0/8
    // - 172.16.0.0/12
    // - 192.168.0.0/16
    return /^(https?|capacitor):\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin);
  };

  // Socket.IO for real-time progress updates
  const io = new SocketServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isLocalOrigin(origin)) {
          callback(null, true);
        } else {
          callback(null, origin === config.clientOrigin);
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Wire Socket.IO to the conversion controller
  setSocketIO(io);

  // Socket.IO connection handler
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.debug(`Client disconnected: ${socket.id}`);
    });
  });

  // CORS configuration
  app.use(cors({
    origin: function(origin, callback) {
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Range'],
    exposedHeaders: ['Accept-Ranges', 'Content-Range', 'Content-Encoding', 'Content-Length']
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files for converted outputs
  app.use('/output', express.static(config.paths.output));
  app.use('/thumbnails', express.static(config.paths.thumbnails));

  // API Routes
  app.use('/api/videos', videoRoutes);
  app.use('/api/conversions', conversionRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/history', historyRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // Serve built client frontend static files in production
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/output') || req.path.startsWith('/thumbnails')) {
        return next();
      }
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // Error handler (must be last)
  app.use(errorHandler as any);

  return { app, httpServer, io };
}
