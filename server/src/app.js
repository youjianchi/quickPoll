import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRouter from './routes/auth.js';
import pollsRouter from './routes/polls.js';

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
  })
);
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/api/polls', pollsRouter);

app.use((err, _req, res, _next) => {
  if (err?.status && err?.message) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  console.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
