import { supabase, taskQuery, shapeTask, setCors } from '../../_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;

  try {
    // ── PUT /api/tasks/:id ─────────────────────────────────────
    if (req.method === 'PUT') {
      const { title, concept, description, dueDate, status, priority, assignedTo } = req.body;

      const { error } = await supabase
        .from('tasks')
        .update({ title, concept: concept || null, description: description || null, due_date: dueDate || null, status: status || 'pending', priority: priority || 'medium', assigned_to: assignedTo || null })
        .eq('id', id);

      if (error) throw error;
      const { data, error: fetchErr } = await taskQuery().eq('id', id).single();
      if (fetchErr) throw fetchErr;
      return res.json(shapeTask(data));
    }

    // ── DELETE /api/tasks/:id ──────────────────────────────────
    if (req.method === 'DELETE') {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
