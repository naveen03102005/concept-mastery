import express from 'express';
import multer from 'multer';
import path from 'path';
import { supabase } from '../supabaseClient.js';

// ── Multer local disk storage (fallback when Supabase Storage not configured) ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads')),
  filename:    (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({ storage });

const router = express.Router();

// ── Helper: shape a Supabase task row → frontend-compatible object ──
function shapeTask(row) {
  if (!row) return null;
  return {
    _id:           row.id,
    id:            row.id,
    title:         row.title,
    concept:       row.concept,
    description:   row.description,
    dueDate:       row.due_date,
    status:        row.status,
    priority:      row.priority,
    responseText:  row.response_text,
    responseImage: row.response_image,
    feedback:      row.feedback,
    submittedAt:   row.submitted_at,
    approvedAt:    row.approved_at,
    rejectedAt:    row.rejected_at,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
    createdBy: row.staff_creator
      ? { _id: row.staff_creator.id, name: row.staff_creator.name }
      : null,
    assignedTo: row.student_assigned
      ? { _id: row.student_assigned.id, name: row.student_assigned.name, grade: row.student_assigned.grade }
      : null,
  };
}

// ── Base query with joins ──────────────────────────────────────
function taskQuery() {
  return supabase
    .from('tasks')
    .select(`
      id, title, concept, description, due_date, status, priority,
      response_text, response_image, feedback,
      submitted_at, approved_at, rejected_at, created_at, updated_at,
      staff_creator:staff!tasks_created_by_fkey ( id, name ),
      student_assigned:students!tasks_assigned_to_fkey ( id, name, grade )
    `);
}

// ── GET /api/tasks ─────────────────────────────────────────────
router.get('/tasks', async (req, res) => {
  try {
    const { createdBy, assignedTo } = req.query;
    let q = taskQuery().order('created_at', { ascending: false });

    if (createdBy) {
      q = q.eq('created_by', createdBy);
    }

    if (assignedTo) {
      // Return tasks assigned to this student OR tasks with no specific assignee
      q = q.or(`assigned_to.eq.${assignedTo},assigned_to.is.null`);
    }

    const { data, error } = await q;
    if (error) throw error;

    res.json((data || []).map(shapeTask));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tasks ────────────────────────────────────────────
router.post('/tasks', async (req, res) => {
  try {
    const { title, concept, description, dueDate, priority, assignedTo, createdBy } = req.body;

    const insert = {
      title,
      concept:     concept  || null,
      description: description || null,
      due_date:    dueDate  || null,
      priority:    priority || 'medium',
      assigned_to: assignedTo || null,
      created_by:  createdBy  || null,
      status:      'pending',
    };

    const { data: inserted, error: insErr } = await supabase
      .from('tasks')
      .insert(insert)
      .select('id')
      .single();

    if (insErr) throw insErr;

    // Fetch with joins
    const { data, error } = await taskQuery().eq('id', inserted.id).single();
    if (error) throw error;

    res.status(201).json(shapeTask(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/tasks/:id ─────────────────────────────────────────
router.put('/tasks/:id', async (req, res) => {
  try {
    const { title, concept, description, dueDate, status, priority, assignedTo, responseText } = req.body;

    const { error: updErr } = await supabase
      .from('tasks')
      .update({
        title,
        concept:       concept       || null,
        description:   description   || null,
        due_date:      dueDate       || null,
        status:        status        || 'pending',
        priority:      priority      || 'medium',
        assigned_to:   assignedTo    || null,
        response_text: responseText  || null,
      })
      .eq('id', req.params.id);

    if (updErr) throw updErr;

    const { data, error } = await taskQuery().eq('id', req.params.id).single();
    if (error) throw error;

    res.json(shapeTask(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tasks/:id/submit (student submits response) ──────
router.post('/tasks/:id/submit', upload.single('responseImage'), async (req, res) => {
  try {
    const { responseText } = req.body;

    if (!responseText || typeof responseText !== 'string' || !responseText.trim()) {
      return res.status(400).json({ error: 'Response is required' });
    }

    const updateObj = {
      response_text: responseText.trim(),
      submitted_at:  new Date().toISOString(),
      status:        'submitted',
    };

    // Handle uploaded image (local disk)
    if (req.file) {
      updateObj.response_image = `/uploads/${req.file.filename}`;
    }

    const { error: updErr } = await supabase
      .from('tasks')
      .update(updateObj)
      .eq('id', req.params.id);

    if (updErr) throw updErr;

    const { data, error } = await taskQuery().eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Task not found' });

    res.json(shapeTask(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tasks/:id/approve (staff approves submission) ────
router.post('/tasks/:id/approve', async (req, res) => {
  try {
    const { approvedBy } = req.body || {};

    // Verify it's submitted first
    const { data: existing, error: fetchErr } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !existing) return res.status(404).json({ error: 'Task not found' });
    if (existing.status !== 'submitted') {
      return res.status(400).json({ error: 'Only submitted tasks can be approved' });
    }

    const { error: updErr } = await supabase
      .from('tasks')
      .update({
        status:      'completed',
        approved_at: new Date().toISOString(),
        approved_by: approvedBy || null,
      })
      .eq('id', req.params.id);

    if (updErr) throw updErr;

    const { data, error } = await taskQuery().eq('id', req.params.id).single();
    if (error) throw error;

    res.json(shapeTask(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tasks/:id/reject (staff returns for revision) ────
router.post('/tasks/:id/reject', async (req, res) => {
  try {
    const { rejectedBy, feedback } = req.body || {};

    const { error: updErr } = await supabase
      .from('tasks')
      .update({
        status:      'in-progress',
        feedback:    feedback    || null,
        rejected_at: new Date().toISOString(),
        rejected_by: rejectedBy || null,
      })
      .eq('id', req.params.id);

    if (updErr) throw updErr;

    const { data, error } = await taskQuery().eq('id', req.params.id).single();
    if (error) throw error;

    res.json(shapeTask(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/tasks/:id ──────────────────────────────────────
router.delete('/tasks/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
