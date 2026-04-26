const https = require('https');
 
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
 
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not set. Go to Vercel project Settings > Environment Variables and add it.' });
  }
 
  const messages = req.body && req.body.messages;
  const model = (req.body && req.body.model) || 'llama-3.3-70b-versatile';
  const max_tokens = (req.body && req.body.max_tokens) || 2500;
 
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }
 
  const body = JSON.stringify({
    model: model,
    messages: messages,
    max_tokens: max_tokens,
    temperature: 0.75
  });
 
  const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
      'Content-Length': Buffer.byteLength(body)
    }
  };
 
  const request = https.request(options, function(groqRes) {
    let data = '';
    groqRes.on('data', function(chunk) { data += chunk; });
    groqRes.on('end', function() {
      try {
        const parsed = JSON.parse(data);
        res.status(200).json(parsed);
      } catch (e) {
        res.status(500).json({ error: 'Parse error: ' + e.message, raw: data.substring(0, 200) });
      }
    });
  });
 
  request.on('error', function(err) {
    res.status(500).json({ error: 'Network error: ' + err.message });
  });
 
  request.write(body);
  request.end();
}
