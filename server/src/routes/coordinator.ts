import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Batch, User } from '../models/index.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const coordinatorRouter = Router();
coordinatorRouter.use(requireAuth, requireRole('coordinator'));

async function assertOwnsBatch(user: any, batchId: string) {
  if (!Types.ObjectId.isValid(batchId)) throw new HttpError(400, 'Invalid batchId');
  const b = await Batch.findById(batchId);
  if (!b) throw new HttpError(404, 'Batch not found');
  if (String(b.coordinatorId) !== String(user._id)) {
    throw new HttpError(403, 'You do not coordinate this batch');
  }
  if (b.isArchived) throw new HttpError(400, 'Batch is archived');
  return b;
}

const addStudentSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
});

coordinatorRouter.post('/batches/:id/students', async (req: AuthedRequest, res, next) => {
  try {
    const batch = await assertOwnsBatch(req.user, req.params.id);
    const data = addStudentSchema.parse(req.body);
    const email = data.email.toLowerCase();

    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.role !== 'student') {
        throw new HttpError(409, `That email is already a ${existing.role}`);
      }
      if (existing.batchId && String(existing.batchId) === String(batch._id)) {
        return res.status(200).json({ user: existing, created: false, alreadyEnrolled: true });
      }
      if (existing.batchId && String(existing.batchId) !== String(batch._id)) {
        throw new HttpError(
          409,
          'Student is enrolled in another batch — ask an admin to move them.',
        );
      }
      existing.batchId = batch._id as any;
      existing.isActive = true;
      if (data.fullName && existing.fullName !== data.fullName) existing.fullName = data.fullName;
      await existing.save();
      return res.status(200).json({ user: existing, created: false });
    }

    const created = await User.create({
      email,
      fullName: data.fullName,
      role: 'student',
      batchId: batch._id,
    });
    res.status(201).json({ user: created, created: true });
  } catch (err) {
    next(err);
  }
});

coordinatorRouter.delete(
  '/batches/:id/students/:studentId',
  async (req: AuthedRequest, res, next) => {
    try {
      const batch = await assertOwnsBatch(req.user, req.params.id);
      if (!Types.ObjectId.isValid(req.params.studentId)) {
        throw new HttpError(400, 'Invalid studentId');
      }
      const student = await User.findById(req.params.studentId);
      if (!student) throw new HttpError(404, 'Student not found');
      if (student.role !== 'student' || String(student.batchId) !== String(batch._id)) {
        throw new HttpError(400, 'Not a student of this batch');
      }
      student.batchId = null;
      await student.save();
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);
