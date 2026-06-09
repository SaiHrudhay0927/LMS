import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import OpenAI from 'openai';
import { Chatroom, RoomMessage, User } from '../models/index.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { emitToUser } from '../realtime/io.js';
import { env } from '../config/env.js';

export const roomsRouter = Router();
roomsRouter.use(requireAuth);

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

async function loadMembership(roomId: string, user: any) {
  if (!Types.ObjectId.isValid(roomId)) throw new HttpError(400, 'Invalid roomId');
  const room = await Chatroom.findById(roomId);
  if (!room) throw new HttpError(404, 'Room not found');
  const isMember = room.memberIds.some((m) => String(m) === String(user._id));
  if (!isMember) throw new HttpError(403, 'You are not a member of this room');
  return room;
}

function isHost(room: any, user: any) {
  return String(room.hostId) === String(user._id);
}

function notifyRoom(room: any, event: string, payload: unknown) {
  for (const m of room.memberIds) {
    emitToUser(String(m), event, payload);
  }
}

/* ----------------------------------- LIST ---------------------------------- */

roomsRouter.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const me = req.user!;
    const filter: any = { memberIds: me._id, isArchived: false };
    if (me.role === 'student' && me.batchId) filter.batchId = me.batchId;
    const rooms = await Chatroom.find(filter)
      .sort({ updatedAt: -1 })
      .populate('hostId', 'fullName email avatarUrl')
      .populate('memberIds', 'fullName email avatarUrl')
      .lean();
    res.json(rooms);
  } catch (err) {
    next(err);
  }
});

/* ---------------------------------- CREATE --------------------------------- */

const createSchema = z.object({
  name: z.string().min(2).max(120),
  memberIds: z.array(z.string()).default([]),
});

roomsRouter.post('/', requireRole('student'), async (req: AuthedRequest, res, next) => {
  try {
    const me = req.user!;
    if (!me.batchId) throw new HttpError(400, 'You must be enrolled in a batch to create a room');
    const data = createSchema.parse(req.body);

    // Validate all invited members are students in the same batch.
    const uniqueIds = Array.from(new Set(data.memberIds.filter((id) => Types.ObjectId.isValid(id))));
    if (uniqueIds.length) {
      const members = await User.find({
        _id: { $in: uniqueIds },
        role: 'student',
        batchId: me.batchId,
        isActive: true,
      }).select('_id');
      if (members.length !== uniqueIds.length) {
        throw new HttpError(400, 'All members must be active students in your batch');
      }
    }

    // Host is always a member.
    const memberSet = new Set<string>([String(me._id), ...uniqueIds]);
    const room = await Chatroom.create({
      batchId: me.batchId,
      name: data.name.trim(),
      hostId: me._id,
      memberIds: Array.from(memberSet),
    });

    const populated = await Chatroom.findById(room._id)
      .populate('hostId', 'fullName email avatarUrl')
      .populate('memberIds', 'fullName email avatarUrl');
    console.log(`[audit] room.create id=${room._id} by=${me._id} members=${memberSet.size}`);

    notifyRoom(room, 'room:invited', { roomId: String(room._id) });
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

/* --------------------------------- GET ONE --------------------------------- */

roomsRouter.get('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const room = await loadMembership(req.params.id, req.user);
    const populated = await Chatroom.findById(room._id)
      .populate('hostId', 'fullName email avatarUrl')
      .populate('memberIds', 'fullName email avatarUrl');
    res.json(populated);
  } catch (err) {
    next(err);
  }
});

/* --------------------------------- DELETE ---------------------------------- */

roomsRouter.delete('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const room = await loadMembership(req.params.id, req.user);
    if (!isHost(room, req.user)) throw new HttpError(403, 'Only the host can delete this room');
    await RoomMessage.deleteMany({ roomId: room._id });
    const del = await Chatroom.deleteOne({ _id: room._id });
    if (del.deletedCount !== 1) throw new HttpError(500, 'Room was not deleted');
    console.log(`[audit] room.delete id=${room._id} by=${req.user!._id}`);
    notifyRoom(room, 'room:deleted', { roomId: String(room._id) });
    res.json({ ok: true, deletedId: String(room._id) });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------- MEMBERS --------------------------------- */

roomsRouter.post('/:id/members', async (req: AuthedRequest, res, next) => {
  try {
    const room = await loadMembership(req.params.id, req.user);
    if (!isHost(room, req.user)) throw new HttpError(403, 'Only the host can add members');
    const schema = z.object({ userId: z.string() });
    const { userId } = schema.parse(req.body);
    if (!Types.ObjectId.isValid(userId)) throw new HttpError(400, 'Invalid userId');

    const candidate = await User.findById(userId);
    if (!candidate || candidate.role !== 'student') {
      throw new HttpError(400, 'Only students can be added');
    }
    if (String(candidate.batchId) !== String(room.batchId)) {
      throw new HttpError(400, 'That student is not in your batch');
    }
    if (room.memberIds.some((m) => String(m) === String(candidate._id))) {
      return res.status(200).json({ alreadyMember: true });
    }
    room.memberIds.push(candidate._id as any);
    await room.save();
    console.log(`[audit] room.addMember room=${room._id} user=${candidate._id} by=${req.user!._id}`);

    const populated = await Chatroom.findById(room._id)
      .populate('hostId', 'fullName email avatarUrl')
      .populate('memberIds', 'fullName email avatarUrl');
    notifyRoom(room, 'room:updated', { roomId: String(room._id) });
    res.json(populated);
  } catch (err) {
    next(err);
  }
});

roomsRouter.delete('/:id/members/:userId', async (req: AuthedRequest, res, next) => {
  try {
    const room = await loadMembership(req.params.id, req.user);
    const me = req.user!;
    const removingSelf = String(me._id) === req.params.userId;
    if (!removingSelf && !isHost(room, me)) {
      throw new HttpError(403, 'Only the host can remove other members');
    }
    if (isHost(room, { _id: req.params.userId })) {
      throw new HttpError(400, 'The host cannot be removed. Delete the room instead.');
    }
    const before = room.memberIds.length;
    room.memberIds = room.memberIds.filter((m) => String(m) !== req.params.userId) as any;
    if (room.memberIds.length === before) throw new HttpError(404, 'Member not in this room');
    await room.save();
    console.log(`[audit] room.removeMember room=${room._id} user=${req.params.userId} by=${me._id}`);
    notifyRoom(room, 'room:updated', { roomId: String(room._id) });
    emitToUser(req.params.userId, 'room:kicked', { roomId: String(room._id) });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------- MESSAGES --------------------------------- */

roomsRouter.get('/:id/messages', async (req: AuthedRequest, res, next) => {
  try {
    const room = await loadMembership(req.params.id, req.user);
    const items = await RoomMessage.find({ roomId: room._id })
      .sort({ createdAt: 1 })
      .limit(500)
      .populate('senderId', 'fullName avatarUrl role')
      .lean();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

const sendSchema = z.object({ body: z.string().min(1).max(4000) });
roomsRouter.post('/:id/messages', async (req: AuthedRequest, res, next) => {
  try {
    const room = await loadMembership(req.params.id, req.user);
    const { body } = sendSchema.parse(req.body);
    const msg = await RoomMessage.create({
      roomId: room._id,
      senderId: req.user!._id,
      body,
      isAI: false,
    });
    await Chatroom.updateOne({ _id: room._id }, { $set: { updatedAt: new Date() } });
    const populated = await RoomMessage.findById(msg._id)
      .populate('senderId', 'fullName avatarUrl role')
      .lean();
    notifyRoom(room, 'room:message', { roomId: String(room._id), message: populated });
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

/* -------------------------- AI ANALYSIS (TUTOR) ---------------------------- */

roomsRouter.post('/:id/ai-prompt', async (req: AuthedRequest, res, next) => {
  try {
    if (!openai) {
      throw new HttpError(
        503,
        'AI tutor is not configured. Set OPENAI_API_KEY in server/.env and restart.',
      );
    }
    const room = await loadMembership(req.params.id, req.user);

    const recent = await RoomMessage.find({ roomId: room._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('senderId', 'fullName')
      .lean();
    recent.reverse();

    if (recent.length === 0) {
      throw new HttpError(400, 'Say something in the room first — I have nothing to react to yet.');
    }

    const transcript = recent
      .map((m: any) => {
        const who = m.isAI ? 'Pulse Tutor' : m.senderId?.fullName ?? 'Student';
        return `${who}: ${m.body}`;
      })
      .join('\n');

    const system = [
      `You are "Pulse Tutor", an upbeat study companion observing a group discussion in the chatroom "${room.name}".`,
      'Your job: read the recent transcript and post ONE thoughtful follow-up that pushes the group forward.',
      'Pick the most valuable move from: (a) ask a probing question to surface confusion, (b) propose a small thought experiment, (c) suggest a concrete next step, or (d) gently correct a clear misconception.',
      'Keep it short — 2–4 sentences max. Address the group, not one student. Do not summarize the chat back to them, do not greet them, do not use lists.',
      'If the discussion is off-topic or trivial, ask one playful question that nudges them back to studying.',
    ].join(' ');

    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0.6,
      max_tokens: 220,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `Recent chat in "${room.name}" (oldest → newest):\n\n${transcript}\n\nPost your follow-up now.`,
        },
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? '';
    if (!reply) throw new HttpError(502, 'AI did not return a reply');

    const msg = await RoomMessage.create({
      roomId: room._id,
      senderId: req.user!._id, // who triggered the AI
      body: reply,
      isAI: true,
    });
    await Chatroom.updateOne({ _id: room._id }, { $set: { updatedAt: new Date() } });
    const populated = await RoomMessage.findById(msg._id)
      .populate('senderId', 'fullName avatarUrl role')
      .lean();

    console.log(
      `[audit] room.aiPrompt room=${room._id} by=${req.user!._id} tokens=${completion.usage?.total_tokens ?? '?'}`,
    );
    notifyRoom(room, 'room:message', { roomId: String(room._id), message: populated });
    res.status(201).json(populated);
  } catch (err: any) {
    if (err?.status && err?.message && !(err instanceof HttpError)) {
      return next(new HttpError(err.status, `AI error: ${err.message}`));
    }
    next(err);
  }
});
