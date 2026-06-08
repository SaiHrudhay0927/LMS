import { Router } from 'express';
import { Types } from 'mongoose';
import { Batch, User } from '../models/index.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const batchesRouter = Router();
batchesRouter.use(requireAuth);

// What's accessible to me right now (used by sidebars / switchers).
batchesRouter.get('/mine', async (req: AuthedRequest, res, next) => {
  try {
    const u = req.user!;
    if (u.role === 'admin') {
      const items = await Batch.find({ isArchived: false })
        .populate('coordinatorId', 'fullName email')
        .sort({ createdAt: -1 })
        .lean();
      return res.json(items);
    }
    if (u.role === 'coordinator') {
      const items = await Batch.find({ coordinatorId: u._id, isArchived: false })
        .populate('coordinatorId', 'fullName email')
        .sort({ createdAt: -1 })
        .lean();
      return res.json(items);
    }
    // student
    if (!u.batchId) return res.json([]);
    const b = await Batch.findById(u.batchId)
      .populate('coordinatorId', 'fullName email')
      .lean();
    res.json(b ? [b] : []);
  } catch (err) {
    next(err);
  }
});

batchesRouter.get('/:id', async (req: AuthedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) throw new HttpError(400, 'Invalid id');
    const u = req.user!;
    const batch = await Batch.findById(req.params.id)
      .populate('coordinatorId', 'fullName email')
      .lean();
    if (!batch) throw new HttpError(404, 'Batch not found');

    const canSee =
      u.role === 'admin' ||
      (u.role === 'coordinator' && String(batch.coordinatorId?._id ?? batch.coordinatorId) === String(u._id)) ||
      (u.role === 'student' && String(u.batchId) === String(batch._id));
    if (!canSee) throw new HttpError(403, 'Not allowed to view this batch');
    res.json(batch);
  } catch (err) {
    next(err);
  }
});

batchesRouter.get('/:id/roster', async (req: AuthedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) throw new HttpError(400, 'Invalid id');
    const u = req.user!;
    const batch = await Batch.findById(req.params.id);
    if (!batch) throw new HttpError(404, 'Batch not found');
    const canSee =
      u.role === 'admin' ||
      (u.role === 'coordinator' && String(batch.coordinatorId) === String(u._id)) ||
      (u.role === 'student' && String(u.batchId) === String(batch._id));
    if (!canSee) throw new HttpError(403, 'Not allowed');

    const students = await User.find({ role: 'student', batchId: batch._id, isActive: true })
      .select('fullName email avatarUrl')
      .sort({ fullName: 1 })
      .lean();
    res.json({ batchId: String(batch._id), students });
  } catch (err) {
    next(err);
  }
});
