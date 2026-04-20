import express from 'express';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// ── GET /api/concepts ──────────────────────────────────────────
router.get('/concepts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('concepts')
      .select(`
        id, name, subject, description, created_at,
        created_by:staff ( id, name )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Normalise shape to match old Mongoose response
    const concepts = (data || []).map(c => ({
      _id:         c.id,
      id:          c.id,
      name:        c.name,
      subject:     c.subject,
      description: c.description,
      createdAt:   c.created_at,
      createdBy:   c.created_by,
    }));

    res.json(concepts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/concepts ─────────────────────────────────────────
router.post('/concepts', async (req, res) => {
  try {
    const { name, subject, description, createdBy } = req.body;

    const { data, error } = await supabase
      .from('concepts')
      .insert({ name, subject, description, created_by: createdBy || null })
      .select(`
        id, name, subject, description, created_at,
        created_by:staff ( id, name )
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      _id:         data.id,
      id:          data.id,
      name:        data.name,
      subject:     data.subject,
      description: data.description,
      createdAt:   data.created_at,
      createdBy:   data.created_by,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/mastery/student/:studentId ────────────────────────
router.get('/mastery/student/:studentId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mastery')
      .select(`
        id, mastery_level, last_assessed, notes,
        concept:concepts ( id, name, subject, description )
      `)
      .eq('student_id', req.params.studentId);

    if (error) throw error;

    const mastery = (data || []).map(m => ({
      _id:          m.id,
      id:           m.id,
      masteryLevel: m.mastery_level,
      lastAssessed: m.last_assessed,
      notes:        m.notes,
      concept:      m.concept
        ? { _id: m.concept.id, ...m.concept }
        : null,
    }));

    res.json(mastery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/mastery (upsert) ─────────────────────────────────
router.post('/mastery', async (req, res) => {
  try {
    const { student, concept, masteryLevel, notes } = req.body;

    const { data, error } = await supabase
      .from('mastery')
      .upsert(
        {
          student_id:    student,
          concept_id:    concept,
          mastery_level: masteryLevel,
          notes,
          last_assessed: new Date().toISOString(),
        },
        { onConflict: 'student_id,concept_id' }
      )
      .select()
      .single();

    if (error) throw error;

    res.json({
      _id:          data.id,
      id:           data.id,
      masteryLevel: data.mastery_level,
      lastAssessed: data.last_assessed,
      notes:        data.notes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/students ──────────────────────────────────────────
router.get('/students', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('id, email, name, grade, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const students = (data || []).map(s => ({
      _id:       s.id,
      id:        s.id,
      email:     s.email,
      name:      s.name,
      grade:     s.grade,
      createdAt: s.created_at,
    }));

    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;