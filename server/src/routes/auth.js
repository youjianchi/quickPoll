import { Router } from 'express';
import { z } from 'zod';
import { getAnonClient, getServiceClient } from '../lib/supabaseClient.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

router.post('/sign-up', async (req, res, next) => {
  try {
    const { email, password } = credentialsSchema.parse(req.body);
    const supabase = getAnonClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({ user: data.user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? 'Invalid input.' });
      return;
    }
    next(error);
  }
});

router.post('/sign-in', async (req, res, next) => {
  try {
    const { email, password } = credentialsSchema.parse(req.body);
    const supabase = getAnonClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      res.status(401).json({ error: error?.message ?? 'Invalid email or password.' });
      return;
    }

    const { session, user } = data;

    res.json({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? 'Invalid input.' });
      return;
    }
    next(error);
  }
});

router.post('/sign-out', async (req, res, next) => {
  try {
    const bodySchema = z.object({ refreshToken: z.string().min(1) });
    const { refreshToken } = bodySchema.parse(req.body);

    const supabase = getServiceClient();
    const { error } = await supabase.auth.admin.signOut(refreshToken);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(204).send();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? 'Invalid input.' });
      return;
    }
    next(error);
  }
});

router.get('/session', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
    },
  });
});

export default router;
