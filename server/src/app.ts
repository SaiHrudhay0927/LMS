import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { coordinatorRouter } from './routes/coordinator.js';
import { batchesRouter } from './routes/batches.js';
import { materialsRouter } from './routes/materials.js';
import { doubtsRouter } from './routes/doubts.js';
import { messagesRouter } from './routes/messages.js';
import { notificationsRouter } from './routes/notifications.js';
import { errorHandler, notFound } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/uploads', express.static(path.resolve('uploads')));

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/coordinator', coordinatorRouter);
  app.use('/api/batches', batchesRouter);
  app.use('/api/materials', materialsRouter);
  app.use('/api/doubts', doubtsRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/notifications', notificationsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
