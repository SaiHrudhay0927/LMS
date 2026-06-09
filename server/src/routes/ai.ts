import { Router } from 'express';
import { z } from 'zod';
import OpenAI from 'openai';
import { env } from '../config/env.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const aiRouter = Router();
aiRouter.use(requireAuth);

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

const MAX_HISTORY = 16; // keep the last N turns so tokens stay bounded
const MAX_MSG_LEN = 4000;

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(MAX_MSG_LEN),
      }),
    )
    .min(1)
    .max(MAX_HISTORY),
});

function systemPrompt(fullName: string) {
  return [
    `You are Pulse Tutor, a friendly, patient study assistant for ${fullName}, a student in a cohort-based learning program.`,
    'Help the student understand concepts, debug code, work through problems, and study for assessments.',
    'Prefer short, focused explanations. When the question is technical, show worked steps. When the question is conceptual, give an intuition first and a precise definition after.',
    'If the student shares code, format it with Markdown code fences. Be honest when you are not sure.',
    'You do not have access to the student’s batch materials or coordinator—only this conversation. If a question needs course-specific context, ask them to paste the relevant material.',
    'Refuse to do graded assessments on the student’s behalf, but you may explain the underlying concepts.',
  ].join(' ');
}

aiRouter.post('/chat', async (req: AuthedRequest, res, next) => {
  try {
    if (!openai) {
      throw new HttpError(
        503,
        'AI tutor is not configured. Set OPENAI_API_KEY in server/.env and restart.',
      );
    }
    const { messages } = chatSchema.parse(req.body);
    const user = req.user!;

    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0.4,
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt(user.fullName) },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? '';
    if (!reply) throw new HttpError(502, 'AI did not return a reply');

    console.log(
      `[audit] ai.chat by=${user._id} (${user.email}) model=${env.OPENAI_MODEL} tokens=${completion.usage?.total_tokens ?? '?'}`,
    );

    res.json({
      reply,
      usage: completion.usage,
      model: completion.model,
    });
  } catch (err: any) {
    // OpenAI errors carry useful details; surface a clean message.
    if (err?.status && err?.message) {
      return next(new HttpError(err.status, `AI error: ${err.message}`));
    }
    next(err);
  }
});
