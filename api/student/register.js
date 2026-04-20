import { supabase, setCors } from '../_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password, name, grade } = req.body;
    const { data, error } = await supabase
      .from('students')
      .insert({ email, password, name, grade })
      .select('id, email, name, grade')
      .single();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'Email already exists' });
      throw error;
    }
    res.status(201).json({ success: true, user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
