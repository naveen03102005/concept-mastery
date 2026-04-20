import { supabase, setCors } from '../_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { data, error } = await supabase
      .from('students')
      .select('id, email, name, grade, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json((data || []).map(s => ({ _id: s.id, ...s })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
