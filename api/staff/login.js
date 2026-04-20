import { supabase, setCors } from '../_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password } = req.body;
    const { data, error } = await supabase
      .from('staff')
      .select('id, email, name, role')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !data) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ success: true, user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
