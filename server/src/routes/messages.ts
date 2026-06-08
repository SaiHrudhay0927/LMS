import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Batch, Message, User } from '../models/index.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { emitToUser } from '../realtime/io.js';

export const messagesRouter = Router();
messagesRouter.use(requireAuth);

// Build the chat-able people list for me.
messagesRouter.get('/contacts', async (req: AuthedRequest, res, next) => {
  try {
    const u = req.user!;
    let people: any[] = [];
    if (u.role === 'student') {
      if (!u.batchId) return res.json([]);
      const [batch, batchmates] = await Promise.all([
        Batch.findById(u.batchId).populate('coordinatorId', 'fullName email avatarUrl role'),
        User.find({ role: 'student', batchId: u.batchId, _id: { $ne: u._id } })
          .select('fullName email avatarUrl role')
          .sort({ fullName: 1 }),
      ]);
      people = [...batchmates];
      if (batch?.coordinatorId) people.unshift(batch.coordinatorId as any);
    } else if (u.role === 'coordinator') {
      const myBatches = await Batch.find({ coordinatorId: u._id }).select('_id');
      const students = await User.find({
        role: 'student',
        batchId: { $in: myBatches.map((b) => b._id) },
      })
        .select('fullName email avatarUrl role batchId')
        .sort({ fullName: 1 });
      people = students;
    } else {
      // admin: everyone but self
      people = await User.find({ _id: { $ne: u._id }, isActive: true })
        .select('fullName email avatarUrl role')
        .sort({ fullName: 1 });
    }

    // unread counts per sender
    const unread = await Message.aggregate([
      { $match: { recipientId: u._id, readAt: null } },
      { $group: { _id: '$senderId', count: { $sum: 1 } } },
    ]);
    const unreadMap = new Map(unread.map((x) => [String(x._id), x.count as number]));
    const enriched = people.map((p: any) => ({
      _id: String(p._id),
      fullName: p.fullName,
      email: p.email,
      avatarUrl: p.avatarUrl,
      role: p.role,
      unread: unreadMap.get(String(p._id)) ?? 0,
    }));
    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// Thread between me and :otherId
messagesRouter.get('/:otherId', async (req: AuthedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.otherId)) throw new HttpError(400, 'Invalid id');
    const me = req.user!._id;
    const other = new Types.ObjectId(req.params.otherId);

    const items = await Message.find({
      $or: [
        { senderId: me, recipientId: other },
        { senderId: other, recipientId: me },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    // mark unread → read
    await Message.updateMany(
      { senderId: other, recipientId: me, readAt: null },
      { $set: { readAt: new Date() } },
    );
    res.json(items);
  } catch (err) {
    next(err);
  }
});

const sendSchema = z.object({
  recipientId: z.string(),
  body: z.string().min(1).max(4000),
});

messagesRouter.post('/', async (req: AuthedRequest, res, next) => {
  try {
    const data = sendSchema.parse(req.body);
    const me = req.user!;
    if (!Types.ObjectId.isValid(data.recipientId)) throw new HttpError(400, 'Invalid recipientId');
    const other = await User.findById(data.recipientId);
    if (!other || !other.isActive) throw new HttpError(404, 'Recipient not found');

    // figure out a sensible batch tag for the message
    let batchId: any = me.batchId ?? other.batchId ?? null;
    if (!batchId) {
      // coordinator <-> admin etc.: just pick a batch the coordinator owns if any
      if (me.role === 'coordinator') {
        const b = await Batch.findOne({ coordinatorId: me._id });
        batchId = b?._id ?? null;
      } else if (other.role === 'coordinator') {
        const b = await Batch.findOne({ coordinatorId: other._id });
        batchId = b?._id ?? null;
      }
    }
    if (!batchId) {
      const anyBatch = await Batch.findOne();
      batchId = anyBatch?._id;
    }

    const msg = await Message.create({
      batchId,
      senderId: me._id,
      recipientId: other._id,
      body: data.body,
    });
    emitToUser(String(other._id), 'message:new', msg.toObject());
    res.status(201).json(msg);
  } catch (err) {
    next(err);
  }
});

messagesRouter.get('/_/unread-count', async (req: AuthedRequest, res, next) => {
  try {
    const n = await Message.countDocuments({ recipientId: req.user!._id, readAt: null });
    res.json({ count: n });
  } catch (err) {
    next(err);
  }
});
