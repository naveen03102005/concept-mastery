import { supabase, taskQuery, shapeTask, setCors } from '../../_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'in-progress', feedback: req.body?.feedback || null, rejected_at: new Date().toISOString(), rejected_by: req.body?.rejectedBy || null })
      .eq('id', id);

    if (error) throw error;
    const { data, error: e2 } = await taskQuery().eq('id', id).single();
    if (e2) throw e2;
    res.json(shapeTask(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
