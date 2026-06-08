import { Router } from 'express';
import { Types } from 'mongoose';
import { Notification } from '../models/Notification.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const items = await Notification.find({ userId: req.user!._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

notificationsRouter.get('/unread-count', async (req: AuthedRequest, res, next) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user!._id, isRead: false });
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post('/mark-all-read', async (req: AuthedRequest, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user!._id, isRead: false }, { isRead: true });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post('/:id/read', async (req: AuthedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) throw new HttpError(400, 'Invalid id');
    await Notification.updateOne(
      { _id: req.params.id, userId: req.user!._id },
      { isRead: true },
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
