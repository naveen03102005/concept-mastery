import express from 'express';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// ── Staff Login ────────────────────────────────────────────────
router.post('/staff/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase
      .from('staff')
      .select('id, email, name, role, password')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      success: true,
      user: { id: data.id, email: data.email, name: data.name, role: data.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Staff Register ─────────────────────────────────────────────
router.post('/staff/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    const { data, error } = await supabase
      .from('staff')
      .insert({ email, password, name, role: role || 'teacher' })
      .select('id, email, name, role')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      throw error;
    }

    res.status(201).json({ success: true, user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Student Login ──────────────────────────────────────────────
router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase
      .from('students')
      .select('id, email, name, grade, password')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      success: true,
      user: { id: data.id, email: data.email, name: data.name, grade: data.grade },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Student Register ───────────────────────────────────────────
router.post('/student/register', async (req, res) => {
  try {
    const { email, password, name, grade } = req.body;

    const { data, error } = await supabase
      .from('students')
      .insert({ email, password, name, grade })
      .select('id, email, name, grade')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      throw error;
    }

    res.status(201).json({ success: true, user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;