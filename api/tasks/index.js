import { supabase, taskQuery, shapeTask, setCors } from '../_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── GET /api/tasks ─────────────────────────────────────────
    if (req.method === 'GET') {
      const { createdBy, assignedTo } = req.query;
      let q = taskQuery().order('created_at', { ascending: false });

      if (createdBy)  q = q.eq('created_by', createdBy);
      if (assignedTo) q = q.or(`assigned_to.eq.${assignedTo},assigned_to.is.null`);

      const { data, error } = await q;
      if (error) throw error;
      return res.json((data || []).map(shapeTask));
    }

    // ── POST /api/tasks ────────────────────────────────────────
    if (req.method === 'POST') {
      const { title, concept, description, dueDate, priority, assignedTo, createdBy } = req.body;

      const { data: inserted, error: insErr } = await supabase
        .from('tasks')
        .insert({
          title,
          concept:     concept     || null,
          description: description || null,
          due_date:    dueDate     || null,
          priority:    priority    || 'medium',
          assigned_to: assignedTo  || null,
          created_by:  createdBy   || null,
          status:      'pending',
        })
        .select('id')
        .single();

      if (insErr) throw insErr;

      const { data, error } = await taskQuery().eq('id', inserted.id).single();
      if (error) throw error;
      return res.status(201).json(shapeTask(data));
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
