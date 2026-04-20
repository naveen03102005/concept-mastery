import { setCors } from '../_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, context } = req.body;
    const apiKey = process.env.GROK_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'AI service not configured' });

    const systemPrompt = `You are an educational AI assistant helping students understand academic concepts.
Context: ${context || 'General academic assistance'}
Be concise, encouraging, and explain concepts clearly.`;

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `AI API error: ${err}` });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response generated.';
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
