import { supabase, setCors } from '../_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('concepts')
        .select('id, name, subject, description, created_at, created_by:staff(id, name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json((data || []).map(c => ({ _id: c.id, ...c })));
    }

    if (req.method === 'POST') {
      const { name, subject, description, createdBy } = req.body;
      const { data, error } = await supabase
        .from('concepts')
        .insert({ name, subject, description, created_by: createdBy || null })
        .select('id, name, subject, description, created_at')
        .single();
      if (error) throw error;
      return res.status(201).json({ _id: data.id, ...data });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
