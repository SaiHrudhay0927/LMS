import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Batch, Doubt, Notification, User } from '../models/index.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { emitToUser } from '../realtime/io.js';

export const doubtsRouter = Router();
doubtsRouter.use(requireAuth);

async function assertCanReadBatch(user: any, batchId: any) {
  const b = await Batch.findById(batchId);
  if (!b) throw new HttpError(404, 'Batch not found');
  if (user.role === 'admin') return b;
  if (user.role === 'coordinator' && String(b.coordinatorId) === String(user._id)) return b;
  if (user.role === 'student' && String(user.batchId) === String(b._id)) return b;
  throw new HttpError(403, 'Not allowed');
}

doubtsRouter.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const u = req.user!;
    const status = String(req.query.status ?? '');
    const batchIdQuery = String(req.query.batchId ?? '');

    const filter: any = {};
    if (status === 'open' || status === 'resolved') filter.status = status;

    if (u.role === 'admin') {
      if (batchIdQuery) filter.batchId = batchIdQuery;
    } else if (u.role === 'coordinator') {
      const myBatches = await Batch.find({ coordinatorId: u._id }).select('_id');
      filter.batchId = { $in: myBatches.map((b) => b._id) };
      if (batchIdQuery && myBatches.some((b) => String(b._id) === batchIdQuery)) {
        filter.batchId = batchIdQuery;
      }
    } else {
      filter.studentId = u._id;
    }
    const items = await Doubt.find(filter)
      .sort({ createdAt: -1 })
      .populate('studentId', 'fullName email avatarUrl')
      .populate('materialId', 'title type')
      .lean();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

doubtsRouter.get('/:id', async (req: AuthedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) throw new HttpError(400, 'Invalid id');
    const d = await Doubt.findById(req.params.id)
      .populate('studentId', 'fullName email avatarUrl')
      .populate('materialId', 'title type')
      .populate('responses.authorId', 'fullName role avatarUrl');
    if (!d) throw new HttpError(404, 'Doubt not found');
    await assertCanReadBatch(req.user, d.batchId);
    res.json(d);
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(4000).optional().default(''),
  materialId: z.string().nullable().optional(),
});

doubtsRouter.post('/', requireRole('student'), async (req: AuthedRequest, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const u = req.user!;
    if (!u.batchId) throw new HttpError(400, 'Student is not in a batch');

    const d = await Doubt.create({
      batchId: u.batchId,
      studentId: u._id,
      materialId: data.materialId || null,
      title: data.title,
      description: data.description,
      status: 'open',
    });

    // notify coordinator(s)
    const batch = await Batch.findById(u.batchId);
    if (batch?.coordinatorId) {
      const notif = await Notification.create({
        userId: batch.coordinatorId,
        type: 'doubt.new',
        payload: { doubtId: String(d._id), title: d.title, studentName: u.fullName },
      });
      emitToUser(String(batch.coordinatorId), 'notification', notif.toObject());
      emitToUser(String(batch.coordinatorId), 'doubt:new', { doubtId: String(d._id) });
    }
    res.status(201).json(d);
  } catch (err) {
    next(err);
  }
});

const replySchema = z.object({ body: z.string().min(1).max(4000) });

doubtsRouter.post('/:id/responses', async (req: AuthedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) throw new HttpError(400, 'Invalid id');
    const { body } = replySchema.parse(req.body);
    const d = await Doubt.findById(req.params.id);
    if (!d) throw new HttpError(404, 'Doubt not found');
    await assertCanReadBatch(req.user, d.batchId);

    d.responses.push({ authorId: req.user!._id as any, body, at: new Date() } as any);
    await d.save();

    // notify the other side
    const u = req.user!;
    const otherUserId = String(u._id) === String(d.studentId) ? null : d.studentId;
    if (otherUserId) {
      const notif = await Notification.create({
        userId: otherUserId,
        type: 'doubt.reply',
        payload: { doubtId: String(d._id), title: d.title },
      });
      emitToUser(String(otherUserId), 'notification', notif.toObject());
      emitToUser(String(otherUserId), 'doubt:update', { doubtId: String(d._id) });
    } else {
      const batch = await Batch.findById(d.batchId);
      if (batch?.coordinatorId) {
        emitToUser(String(batch.coordinatorId), 'doubt:update', { doubtId: String(d._id) });
      }
    }
    const fresh = await Doubt.findById(d._id).populate('responses.authorId', 'fullName role avatarUrl');
    res.json(fresh);
  } catch (err) {
    next(err);
  }
});

doubtsRouter.post('/:id/resolve', requireRole('coordinator', 'admin', 'student'), async (req: AuthedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) throw new HttpError(400, 'Invalid id');
    const d = await Doubt.findById(req.params.id);
    if (!d) throw new HttpError(404, 'Doubt not found');
    await assertCanReadBatch(req.user, d.batchId);
    d.status = 'resolved';
    d.resolvedAt = new Date();
    await d.save();
    console.log(`[audit] doubt.resolve id=${d._id} by=${req.user!._id}`);
    emitToUser(String(d.studentId), 'doubt:update', { doubtId: String(d._id) });
    res.json(d);
  } catch (err) {
    next(err);
  }
});

doubtsRouter.post('/:id/reopen', async (req: AuthedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) throw new HttpError(400, 'Invalid id');
    const d = await Doubt.findById(req.params.id);
    if (!d) throw new HttpError(404, 'Doubt not found');
    await assertCanReadBatch(req.user, d.batchId);
    d.status = 'open';
    d.resolvedAt = null;
    await d.save();
    console.log(`[audit] doubt.reopen id=${d._id} by=${req.user!._id}`);
    res.json(d);
  } catch (err) {
    next(err);
  }
});

doubtsRouter.delete('/:id', async (req: AuthedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) throw new HttpError(400, 'Invalid id');
    const d = await Doubt.findById(req.params.id);
    if (!d) throw new HttpError(404, 'Doubt not found');

    const u = req.user!;
    const isOwner = String(d.studentId) === String(u._id);
    let canDelete = u.role === 'admin' || isOwner;
    if (!canDelete && u.role === 'coordinator') {
      const batch = await Batch.findById(d.batchId);
      if (batch && String(batch.coordinatorId) === String(u._id)) canDelete = true;
    }
    if (!canDelete) throw new HttpError(403, 'Not allowed to delete this doubt');

    const result = await Doubt.deleteOne({ _id: d._id });
    if (result.deletedCount !== 1) throw new HttpError(500, 'Doubt was not deleted');
    console.log(`[audit] doubt.delete id=${d._id} by=${u._id}`);
    res.json({ ok: true, deletedId: String(d._id) });
  } catch (err) {
    next(err);
  }
});
