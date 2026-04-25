export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
 
  // Get API key from Vercel environment variable (never exposed to users)
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API not configured' });
  }
 
  try {
    const { messages, model, max_tokens } = req.body;
 
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages: messages,
        max_tokens: max_tokens || 2500,
        temperature: 0.75
      })
    });
 
    const data = await response.json();
    return res.status(200).json(data);
 
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
 
