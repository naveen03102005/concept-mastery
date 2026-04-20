
import dotenv from 'dotenv';
import path from 'path';
// Load .env FIRST before any other local imports that read env vars
dotenv.config();

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import dataRoutes from './routes/data.js';
import taskRoutes from './routes/tasks.js';
import aiRoutes from './routes/ai.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Allowed Origins ────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  'https://academic-mastery-3.vercel.app',
  'https://academic-mastery-zeta.vercel.app',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow curl / Postman (no origin) or listed origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));

app.use(express.json());
// Serve uploaded images statically (kept for backward compat – prefer Supabase Storage in prod)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Routes ─────────────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api', dataRoutes);
app.use('/api', taskRoutes);
app.use('/api', aiRoutes);

// ── Root / Health ───────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ message: 'School Portal API (Supabase)', status: 'ok' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', db: 'supabase' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🗄  Database: Supabase (${process.env.SUPABASE_URL || 'URL not set'})`);
});
