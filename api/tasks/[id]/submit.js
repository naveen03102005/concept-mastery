import { supabase, taskQuery, shapeTask, setCors } from '../../_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;

  try {
    const responseText = req.body?.responseText;
    if (!responseText || !String(responseText).trim()) {
      return res.status(400).json({ error: 'Response text is required' });
    }

    const { error } = await supabase
      .from('tasks')
      .update({ response_text: String(responseText).trim(), submitted_at: new Date().toISOString(), status: 'submitted' })
      .eq('id', id);

    if (error) throw error;

    const { data, error: fetchErr } = await taskQuery().eq('id', id).single();
    if (fetchErr || !data) return res.status(404).json({ error: 'Task not found' });

    res.json(shapeTask(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
