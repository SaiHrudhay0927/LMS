import { Server, type Socket } from 'socket.io';
import type http from 'node:http';
import { verifyToken } from '../auth/jwt.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';

let io: Server | null = null;
const userSockets = new Map<string, Set<string>>();

export function initSocket(server: http.Server) {
  io = new Server(server, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const tok = (socket.handshake.auth as any)?.token as string | undefined;
      if (!tok) return next(new Error('No token'));
      const payload = verifyToken(tok);
      const user = await User.findById(payload.sub).select('_id role batchId');
      if (!user || !user.isActive) return next(new Error('Invalid user'));
      (socket.data as any).userId = String(user._id);
      (socket.data as any).role = user.role;
      (socket.data as any).batchId = user.batchId ? String(user.batchId) : null;
      next();
    } catch (err) {
      next(err as any);
    }
  });

  io.on('connection', (socket: Socket) => {
    const { userId, role, batchId } = socket.data as any;
    if (!userId) return socket.disconnect();

    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);
    if (batchId) socket.join(`batch:${batchId}`);

    const set = userSockets.get(userId) ?? new Set<string>();
    set.add(socket.id);
    userSockets.set(userId, set);

    socket.on('disconnect', () => {
      const s = userSockets.get(userId);
      if (!s) return;
      s.delete(socket.id);
      if (!s.size) userSockets.delete(userId);
    });
  });
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

export function emitToBatch(batchId: string, event: string, payload: unknown) {
  if (!io) return;
  io.to(`batch:${batchId}`).emit(event, payload);
}
