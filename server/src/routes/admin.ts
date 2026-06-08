import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import path from 'node:path';
import fs from 'node:fs';
import { Batch, Doubt, Material, Message, Notification, User } from '../models/index.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));

function audit(action: string, req: AuthedRequest, extra: Record<string, unknown> = {}) {
  console.log(
    `[audit] ${action} by=${req.user?._id} (${req.user?.email}) ${JSON.stringify(extra)}`,
  );
}

/* --------------------------------- STATS --------------------------------- */

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const [batches, activeBatches, students, coordinators, materials, openDoubts] =
      await Promise.all([
        Batch.countDocuments(),
        Batch.countDocuments({ isArchived: false }),
        User.countDocuments({ role: 'student', isActive: true }),
        User.countDocuments({ role: 'coordinator', isActive: true }),
        Material.countDocuments(),
        Doubt.countDocuments({ status: 'open' }),
      ]);
    res.json({ batches, activeBatches, students, coordinators, materials, openDoubts });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------- BATCHES ------------------------------- */

const batchCreate = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().default(''),
  coordinatorId: z.string().optional().nullable(),
});

const batchUpdate = batchCreate.partial().extend({
  isArchived: z.boolean().optional(),
});

adminRouter.get('/batches', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));
    const filter: any = {};
    if (q) filter.name = { $regex: q, $options: 'i' };
    const [items, total] = await Promise.all([
      Batch.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('coordinatorId', 'fullName email')
        .lean(),
      Batch.countDocuments(filter),
    ]);

    // student counts
    const counts = await User.aggregate([
      { $match: { role: 'student', batchId: { $in: items.map((b) => b._id) } } },
      { $group: { _id: '$batchId', count: { $sum: 1 } } },
    ]);
    const map = new Map(counts.map((c) => [String(c._id), c.count as number]));
    const enriched = items.map((b) => ({ ...b, studentCount: map.get(String(b._id)) ?? 0 }));
    res.json({ items: enriched, total, page, limit });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/batches', async (req, res, next) => {
  try {
    const data = batchCreate.parse(req.body);
    if (data.coordinatorId) {
      const coord = await User.findById(data.coordinatorId);
      if (!coord || coord.role !== 'coordinator') {
        throw new HttpError(400, 'coordinatorId must reference a coordinator');
      }
    }
    const batch = await Batch.create(data);
    res.status(201).json(batch);
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/batches/:id', async (req: AuthedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) throw new HttpError(400, 'Invalid id');
    const data = batchUpdate.parse(req.body);
    if (data.coordinatorId) {
      const coord = await User.findById(data.coordinatorId);
      if (!coord || coord.role !== 'coordinator') {
        throw new HttpError(400, 'coordinatorId must reference a coordinator');
      }
    }
    const batch = await Batch.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!batch) throw new HttpError(404, 'Batch not found');
    audit('batch.update', req, { batchId: batch._id, fields: Object.keys(data) });
    res.json(batch);
  } catch (err) {
    next(err);
  }
});

// DELETE /batches/:id?hard=true → fully remove + cascade.
// DELETE /batches/:id            → soft delete (set isArchived: true).
adminRouter.delete('/batches/:id', async (req: AuthedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) throw new HttpError(400, 'Invalid id');
    const hard = String(req.query.hard ?? '') === 'true';

    if (!hard) {
      const batch = await Batch.findByIdAndUpdate(
        req.params.id,
        { isArchived: true },
        { new: true },
      );
      if (!batch) throw new HttpError(404, 'Batch not found');
      audit('batch.archive', req, { batchId: batch._id });
      return res.json({ mode: 'archived', batch });
    }

    const batch = await Batch.findById(req.params.id);
    if (!batch) throw new HttpError(404, 'Batch not found');

    // Delete uploaded files for this batch's materials before removing docs.
    const materials = await Material.find({ batchId: batch._id }).select('filePath');
    const uploadsDir = path.resolve('uploads');
    for (const m of materials) {
      if (m.filePath && m.filePath.startsWith('/uploads/')) {
        const p = path.join(uploadsDir, path.basename(m.filePath));
        fs.promises.unlink(p).catch(() => undefined);
      }
    }

    const [matRes, doubtRes, msgRes, unenrollRes] = await Promise.all([
      Material.deleteMany({ batchId: batch._id }),
      Doubt.deleteMany({ batchId: batch._id }),
      Message.deleteMany({ batchId: batch._id }),
      User.updateMany(
        { role: 'student', batchId: batch._id },
        { $set: { batchId: null } },
      ),
    ]);
    const delRes = await Batch.deleteOne({ _id: batch._id });
    if (delRes.deletedCount !== 1) throw new HttpError(500, 'Batch was not deleted');

    audit('batch.hardDelete', req, {
      batchId: batch._id,
      materialsDeleted: matRes.deletedCount,
      doubtsDeleted: doubtRes.deletedCount,
      messagesDeleted: msgRes.deletedCount,
      studentsUnenrolled: unenrollRes.modifiedCount,
    });

    res.json({
      mode: 'deleted',
      deletedId: String(batch._id),
      cascade: {
        materials: matRes.deletedCount,
        doubts: doubtRes.deletedCount,
        messages: msgRes.deletedCount,
        studentsUnenrolled: unenrollRes.modifiedCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------- USERS --------------------------------- */

const userCreate = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  role: z.enum(['admin', 'coordinator', 'student']),
  batchId: z.string().optional().nullable(),
});

adminRouter.get('/users', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim();
    const role = String(req.query.role ?? '').trim();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));
    const filter: any = {};
    if (role) filter.role = role;
    if (q) filter.$or = [{ email: { $regex: q, $options: 'i' } }, { fullName: { $regex: q, $options: 'i' } }];

    const [items, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('batchId', 'name')
        .lean(),
      User.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users', async (req: AuthedRequest, res, next) => {
  try {
    const data = userCreate.parse(req.body);
    const email = data.email.toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) throw new HttpError(409, 'A user with that email already exists');

    if (data.role !== 'student' && data.batchId) {
      throw new HttpError(400, 'Only students may have a batchId');
    }
    if (data.role === 'student' && data.batchId) {
      const b = await Batch.findById(data.batchId);
      if (!b) throw new HttpError(400, 'Batch not found');
    }
    const user = await User.create({ ...data, email });
    audit('user.create', req, { userId: user._id, role: user.role });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/users/:id', async (req: AuthedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) throw new HttpError(400, 'Invalid id');
    const schema = z.object({
      fullName: z.string().min(2).max(120).optional(),
      isActive: z.boolean().optional(),
      batchId: z.string().nullable().optional(),
    });
    const data = schema.parse(req.body);

    const user = await User.findById(req.params.id);
    if (!user) throw new HttpError(404, 'User not found');

    if (data.batchId !== undefined) {
      if (user.role !== 'student') throw new HttpError(400, 'Only students may have a batchId');
      if (data.batchId) {
        const b = await Batch.findById(data.batchId);
        if (!b) throw new HttpError(400, 'Batch not found');
      }
      user.batchId = data.batchId ? new Types.ObjectId(data.batchId) : null;
    }
    if (data.fullName !== undefined) user.fullName = data.fullName;
    if (data.isActive !== undefined) user.isActive = data.isActive;
    await user.save();
    audit('user.update', req, { userId: user._id, fields: Object.keys(data) });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/users/:id', async (req: AuthedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) throw new HttpError(400, 'Invalid id');
    if (String(req.user!._id) === req.params.id) {
      throw new HttpError(400, "You can't delete your own account");
    }
    const user = await User.findById(req.params.id);
    if (!user) throw new HttpError(404, 'User not found');

    // Cascade: clear references this user owns so nothing dangles.
    const [doubtRes, msgRes, batchRes] = await Promise.all([
      Doubt.deleteMany({ studentId: user._id }),
      Message.deleteMany({
        $or: [{ senderId: user._id }, { recipientId: user._id }],
      }),
      user.role === 'coordinator'
        ? Batch.updateMany({ coordinatorId: user._id }, { $set: { coordinatorId: null } })
        : Promise.resolve({ modifiedCount: 0 } as any),
    ]);
    await Notification.deleteMany({ userId: user._id });
    const del = await User.deleteOne({ _id: user._id });
    if (del.deletedCount !== 1) throw new HttpError(500, 'User was not deleted');

    audit('user.delete', req, {
      userId: user._id,
      role: user.role,
      doubtsDeleted: doubtRes.deletedCount,
      messagesDeleted: msgRes.deletedCount,
      batchesUnassigned: batchRes.modifiedCount,
    });
    res.json({ ok: true, deletedId: String(user._id) });
  } catch (err) {
    next(err);
  }
});

// Assign coordinator to a batch — convenience over PATCH /batches/:id
adminRouter.post('/batches/:id/coordinator', async (req: AuthedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) throw new HttpError(400, 'Invalid id');
    const schema = z.object({ coordinatorId: z.string().nullable() });
    const data = schema.parse(req.body);
    if (data.coordinatorId) {
      const coord = await User.findById(data.coordinatorId);
      if (!coord || coord.role !== 'coordinator') {
        throw new HttpError(400, 'coordinatorId must reference a coordinator');
      }
    }
    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      { coordinatorId: data.coordinatorId },
      { new: true },
    );
    if (!batch) throw new HttpError(404, 'Batch not found');
    audit('batch.assignCoordinator', req, {
      batchId: batch._id,
      coordinatorId: data.coordinatorId,
    });
    res.json(batch);
  } catch (err) {
    next(err);
  }
});

// Quick "add coordinator by email" — creates if missing, sets role.
adminRouter.post('/coordinators', async (req: AuthedRequest, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      fullName: z.string().min(2).max(120),
    });
    const data = schema.parse(req.body);
    const email = data.email.toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.role !== 'coordinator') {
        throw new HttpError(409, 'A user with that email exists with a different role');
      }
      return res.json(existing);
    }
    const u = await User.create({ email, fullName: data.fullName, role: 'coordinator' });
    audit('coordinator.create', req, { userId: u._id });
    res.status(201).json(u);
  } catch (err) {
    next(err);
  }
});
