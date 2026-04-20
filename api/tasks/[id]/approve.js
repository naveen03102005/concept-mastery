import { supabase, taskQuery, shapeTask, setCors } from '../../_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;

  try {
    const { data: existing, error: fetchErr } = await supabase.from('tasks').select('id, status').eq('id', id).single();
    if (fetchErr || !existing) return res.status(404).json({ error: 'Task not found' });
    if (existing.status !== 'submitted') return res.status(400).json({ error: 'Only submitted tasks can be approved' });

    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed', approved_at: new Date().toISOString(), approved_by: req.body?.approvedBy || null })
      .eq('id', id);

    if (error) throw error;
    const { data, error: e2 } = await taskQuery().eq('id', id).single();
    if (e2) throw e2;
    res.json(shapeTask(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
