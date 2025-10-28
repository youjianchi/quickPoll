import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import {
  createPollWithOptions,
  fetchPollById,
  voteOnOption,
} from '../lib/polls.js';

const router = Router();

const createPollSchema = z.object({
  question: z.string().min(3, 'Ask a question with at least 3 characters.'),
  options: z
    .array(z.string().trim().min(1, 'Option text cannot be empty.'))
    .min(2, 'Provide at least two options.'),
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { question, options } = createPollSchema.parse(req.body);
    const poll = await createPollWithOptions({
      question,
      options,
      userId: req.user.id,
    });

    res.status(201).json({ poll });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? 'Invalid input.' });
      return;
    }

    if (error?.message) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

router.get('/:pollId', async (req, res, next) => {
  try {
    const pollId = Number.parseInt(req.params.pollId, 10);

    if (Number.isNaN(pollId)) {
      res.status(400).json({ error: 'Poll ID must be a number.' });
      return;
    }

    const poll = await fetchPollById(pollId);

    if (!poll) {
      res.status(404).json({ error: `Poll #${pollId} not found.` });
      return;
    }

    res.json({ poll });
  } catch (error) {
    next(error);
  }
});

const voteSchema = z.object({
  optionId: z.number().int().positive(),
});

router.post('/:pollId/vote', async (req, res, next) => {
  try {
    const pollId = Number.parseInt(req.params.pollId, 10);

    if (Number.isNaN(pollId)) {
      res.status(400).json({ error: 'Poll ID must be a number.' });
      return;
    }

    const { optionId } = voteSchema.parse({
      optionId: Number.parseInt(req.body?.optionId, 10),
    });

    const voteApplied = await voteOnOption(pollId, optionId);

    if (!voteApplied) {
      res.status(404).json({ error: 'Option not found for this poll.' });
      return;
    }

    const poll = await fetchPollById(pollId);
    res.json({ poll });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? 'Invalid input.' });
      return;
    }
    next(error);
  }
});

export default router;
