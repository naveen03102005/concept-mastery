/**
 * api/index.js — Single Vercel Serverless Function (counts as 1!)
 * All /api/* routes are handled here via Express.
 */
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '10mb' }));

// ── Supabase client ───────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ── Helpers ───────────────────────────────────────────────────
function shapeTask(row) {
  if (!row) return null;
  return {
    _id: row.id, id: row.id, title: row.title, concept: row.concept,
    description: row.description, dueDate: row.due_date, status: row.status,
    priority: row.priority, responseText: row.response_text,
    responseImage: row.response_image, feedback: row.feedback,
    submittedAt: row.submitted_at, approvedAt: row.approved_at,
    rejectedAt: row.rejected_at, createdAt: row.created_at, updatedAt: row.updated_at,
    createdBy:  row.staff_creator   ? { _id: row.staff_creator.id,   name: row.staff_creator.name }                                    : null,
    assignedTo: row.student_assigned? { _id: row.student_assigned.id, name: row.student_assigned.name, grade: row.student_assigned.grade } : null,
  };
}

function taskSelect() {
  return supabase.from('tasks').select(`
    id, title, concept, description, due_date, status, priority,
    response_text, response_image, feedback,
    submitted_at, approved_at, rejected_at, created_at, updated_at,
    staff_creator:staff!tasks_created_by_fkey ( id, name ),
    student_assigned:students!tasks_assigned_to_fkey ( id, name, grade )
  `);
}

// ═══════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════════════════════
app.post('/api/staff/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.from('staff').select('id,email,name,role').eq('email', email).eq('password', password).single();
    if (error || !data) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ success: true, user: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/staff/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const { data, error } = await supabase.from('staff').insert({ email, password, name, role: role||'teacher' }).select('id,email,name,role').single();
    if (error) { if (error.code==='23505') return res.status(400).json({ error: 'Email already exists' }); throw error; }
    res.status(201).json({ success: true, user: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.from('students').select('id,email,name,grade').eq('email', email).eq('password', password).single();
    if (error || !data) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ success: true, user: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/student/register', async (req, res) => {
  try {
    const { email, password, name, grade } = req.body;
    const { data, error } = await supabase.from('students').insert({ email, password, name, grade }).select('id,email,name,grade').single();
    if (error) { if (error.code==='23505') return res.status(400).json({ error: 'Email already exists' }); throw error; }
    res.status(201).json({ success: true, user: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
//  DATA ROUTES
// ═══════════════════════════════════════════════════════════════
app.get('/api/students', async (req, res) => {
  try {
    const { data, error } = await supabase.from('students').select('id,email,name,grade,created_at').order('created_at', { ascending: false });
    if (error) throw error;
    res.json((data||[]).map(s => ({ _id: s.id, ...s })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/concepts', async (req, res) => {
  try {
    const { data, error } = await supabase.from('concepts').select('id,name,subject,description,created_at,created_by:staff(id,name)').order('created_at', { ascending: false });
    if (error) throw error;
    res.json((data||[]).map(c => ({ _id: c.id, ...c })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/concepts', async (req, res) => {
  try {
    const { name, subject, description, createdBy } = req.body;
    const { data, error } = await supabase.from('concepts').insert({ name, subject, description, created_by: createdBy||null }).select('id,name,subject,description,created_at').single();
    if (error) throw error;
    res.status(201).json({ _id: data.id, ...data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/mastery/student/:studentId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('mastery')
      .select('id,mastery_level,last_assessed,notes,concept:concepts(id,name,subject,description)')
      .eq('student_id', req.params.studentId);
    if (error) throw error;
    res.json((data||[]).map(m => ({
      _id: m.id, id: m.id, masteryLevel: m.mastery_level,
      lastAssessed: m.last_assessed, notes: m.notes,
      concept: m.concept ? { _id: m.concept.id, ...m.concept } : null,
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/mastery', async (req, res) => {
  try {
    const { student, concept, masteryLevel, notes } = req.body;
    const { data, error } = await supabase.from('mastery').upsert(
      { student_id: student, concept_id: concept, mastery_level: masteryLevel, notes, last_assessed: new Date().toISOString() },
      { onConflict: 'student_id,concept_id' }
    ).select().single();
    if (error) throw error;
    res.json({ _id: data.id, masteryLevel: data.mastery_level, lastAssessed: data.last_assessed, notes: data.notes });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
//  TASK ROUTES
// ═══════════════════════════════════════════════════════════════
app.get('/api/tasks', async (req, res) => {
  try {
    const { createdBy, assignedTo } = req.query;
    let q = taskSelect().order('created_at', { ascending: false });
    if (createdBy)  q = q.eq('created_by', createdBy);
    if (assignedTo) q = q.or(`assigned_to.eq.${assignedTo},assigned_to.is.null`);
    const { data, error } = await q;
    if (error) throw error;
    res.json((data||[]).map(shapeTask));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { title, concept, description, dueDate, priority, assignedTo, createdBy } = req.body;
    const { data: ins, error: ie } = await supabase.from('tasks')
      .insert({ title, concept: concept||null, description: description||null, due_date: dueDate||null, priority: priority||'medium', assigned_to: assignedTo||null, created_by: createdBy||null, status: 'pending' })
      .select('id').single();
    if (ie) throw ie;
    const { data, error } = await taskSelect().eq('id', ins.id).single();
    if (error) throw error;
    res.status(201).json(shapeTask(data));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { title, concept, description, dueDate, status, priority, assignedTo } = req.body;
    const { error } = await supabase.from('tasks')
      .update({ title, concept: concept||null, description: description||null, due_date: dueDate||null, status: status||'pending', priority: priority||'medium', assigned_to: assignedTo||null })
      .eq('id', req.params.id);
    if (error) throw error;
    const { data, error: fe } = await taskSelect().eq('id', req.params.id).single();
    if (fe) throw fe;
    res.json(shapeTask(data));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('tasks').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tasks/:id/submit', async (req, res) => {
  try {
    const responseText = req.body?.responseText;
    if (!responseText || !String(responseText).trim()) return res.status(400).json({ error: 'Response text is required' });
    const { error } = await supabase.from('tasks')
      .update({ response_text: String(responseText).trim(), submitted_at: new Date().toISOString(), status: 'submitted' })
      .eq('id', req.params.id);
    if (error) throw error;
    const { data, error: fe } = await taskSelect().eq('id', req.params.id).single();
    if (fe || !data) return res.status(404).json({ error: 'Task not found' });
    res.json(shapeTask(data));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tasks/:id/approve', async (req, res) => {
  try {
    const { data: ex, error: ee } = await supabase.from('tasks').select('id,status').eq('id', req.params.id).single();
    if (ee || !ex) return res.status(404).json({ error: 'Task not found' });
    if (ex.status !== 'submitted') return res.status(400).json({ error: 'Only submitted tasks can be approved' });
    const { error } = await supabase.from('tasks')
      .update({ status: 'completed', approved_at: new Date().toISOString(), approved_by: req.body?.approvedBy||null })
      .eq('id', req.params.id);
    if (error) throw error;
    const { data, error: fe } = await taskSelect().eq('id', req.params.id).single();
    if (fe) throw fe;
    res.json(shapeTask(data));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tasks/:id/reject', async (req, res) => {
  try {
    const { error } = await supabase.from('tasks')
      .update({ status: 'in-progress', feedback: req.body?.feedback||null, rejected_at: new Date().toISOString(), rejected_by: req.body?.rejectedBy||null })
      .eq('id', req.params.id);
    if (error) throw error;
    const { data, error: fe } = await taskSelect().eq('id', req.params.id).single();
    if (fe) throw fe;
    res.json(shapeTask(data));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
//  AI ROUTE
// ═══════════════════════════════════════════════════════════════
app.post('/api/ai/student-assist', async (req, res) => {
  try {
    const { message, context } = req.body;
    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'AI service not configured' });

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          { role: 'system', content: `You are an educational AI assistant. Context: ${context||'General academic assistance'}. Be concise and encouraging.` },
          { role: 'user',   content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });
    if (!response.ok) { const t = await response.text(); return res.status(response.status).json({ error: t }); }
    const d = await response.json();
    res.json({ reply: d.choices?.[0]?.message?.content || 'No response.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', db: 'Supabase' }));

// ── 404 catch-all ─────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.url} not found` }));

export default app;
