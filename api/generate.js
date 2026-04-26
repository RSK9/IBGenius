const https = require('https');
 
module.exports = function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
 
  var apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not set in Vercel environment variables' });
 
  var messages = req.body && req.body.messages;
  var model = (req.body && req.body.model) || 'llama-3.3-70b-versatile';
  var max_tokens = (req.body && req.body.max_tokens) || 2500;
 
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages array required' });
 
  var payload = JSON.stringify({ model: model, messages: messages, max_tokens: max_tokens, temperature: 0.75 });
 
  var options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
      'Content-Length': Buffer.byteLength(payload)
    }
  };
 
  var request = https.request(options, function(groqRes) {
    var chunks = [];
    groqRes.on('data', function(chunk) { chunks.push(chunk); });
    groqRes.on('end', function() {
      try {
        var parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        return res.status(200).json(parsed);
      } catch(e) {
        return res.status(500).json({ error: 'Parse error: ' + e.message });
      }
    });
  });
 
  request.on('error', function(err) {
    return res.status(500).json({ error: 'Network error: ' + err.message });
  });
 
  request.write(payload);
  request.end();
};
