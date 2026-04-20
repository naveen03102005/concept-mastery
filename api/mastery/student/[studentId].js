import { supabase, setCors } from '../../_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { studentId } = req.query;
    const { data, error } = await supabase
      .from('mastery')
      .select('id, mastery_level, last_assessed, notes, concept:concepts(id, name, subject, description)')
      .eq('student_id', studentId);

    if (error) throw error;
    res.json((data || []).map(m => ({
      _id: m.id,
      id:  m.id,
      masteryLevel: m.mastery_level,
      lastAssessed: m.last_assessed,
      notes:        m.notes,
      concept:      m.concept ? { _id: m.concept.id, ...m.concept } : null,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
