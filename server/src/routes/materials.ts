import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { Types } from 'mongoose';
import { Batch, Material } from '../models/index.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const materialsRouter = Router();
materialsRouter.use(requireAuth);

const UPLOAD_DIR = path.resolve('uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_\-]/gi, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

async function assertCanWriteBatch(user: any, batchId: string) {
  if (!Types.ObjectId.isValid(batchId)) throw new HttpError(400, 'Invalid batchId');
  const b = await Batch.findById(batchId);
  if (!b) throw new HttpError(404, 'Batch not found');
  if (b.isArchived) throw new HttpError(400, 'Batch is archived');
  if (user.role === 'admin') return b;
  if (user.role === 'coordinator' && String(b.coordinatorId) === String(user._id)) return b;
  throw new HttpError(403, 'Not allowed to modify this batch');
}

async function assertCanReadBatch(user: any, batchId: string) {
  if (!Types.ObjectId.isValid(batchId)) throw new HttpError(400, 'Invalid batchId');
  const b = await Batch.findById(batchId);
  if (!b) throw new HttpError(404, 'Batch not found');
  if (user.role === 'admin') return b;
  if (user.role === 'coordinator' && String(b.coordinatorId) === String(user._id)) return b;
  if (user.role === 'student' && String(user.batchId) === String(b._id)) return b;
  throw new HttpError(403, 'Not allowed');
}

// List
materialsRouter.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const batchId = String(req.query.batchId ?? '');
    await assertCanReadBatch(req.user, batchId);
    const items = await Material.find({ batchId })
      .populate('uploadedBy', 'fullName')
      .sort({ createdAt: -1 })
      .lean();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// Create link / video (no file)
const createUrlSchema = z.object({
  batchId: z.string(),
  type: z.enum(['video', 'link']),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().default(''),
  externalUrl: z.string().url(),
});

materialsRouter.post('/url', requireRole('admin', 'coordinator'), async (req: AuthedRequest, res, next) => {
  try {
    const data = createUrlSchema.parse(req.body);
    await assertCanWriteBatch(req.user, data.batchId);
    const m = await Material.create({
      ...data,
      uploadedBy: req.user!._id,
    });
    res.status(201).json(m);
  } catch (err) {
    next(err);
  }
});

// Upload doc
const uploadMetaSchema = z.object({
  batchId: z.string(),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().default(''),
});

materialsRouter.post(
  '/upload',
  requireRole('admin', 'coordinator'),
  upload.single('file'),
  async (req: AuthedRequest, res, next) => {
    try {
      if (!req.file) throw new HttpError(400, 'File is required');
      const meta = uploadMetaSchema.parse(req.body);
      await assertCanWriteBatch(req.user, meta.batchId);
      const filePath = `/uploads/${req.file.filename}`;
      const m = await Material.create({
        batchId: meta.batchId,
        type: 'document',
        title: meta.title,
        description: meta.description,
        filePath,
        uploadedBy: req.user!._id,
      });
      res.status(201).json(m);
    } catch (err) {
      next(err);
    }
  },
);

materialsRouter.delete('/:id', requireRole('admin', 'coordinator'), async (req: AuthedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) throw new HttpError(400, 'Invalid id');
    const m = await Material.findById(req.params.id);
    if (!m) throw new HttpError(404, 'Material not found');
    await assertCanWriteBatch(req.user, String(m.batchId));

    const localFile =
      m.filePath && m.filePath.startsWith('/uploads/')
        ? path.join(UPLOAD_DIR, path.basename(m.filePath))
        : null;

    const result = await Material.deleteOne({ _id: m._id });
    if (result.deletedCount !== 1) {
      throw new HttpError(500, 'Database did not delete the material');
    }
    if (localFile) fs.promises.unlink(localFile).catch(() => undefined);

    console.log(
      `[audit] material deleted id=${m._id} batch=${m.batchId} by=${req.user!._id} (${req.user!.email})`,
    );
    res.json({ ok: true, deletedId: String(m._id) });
  } catch (err) {
    next(err);
  }
});
