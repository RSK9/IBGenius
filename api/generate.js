  }
 
  const body = req.body || {};
  const model = (body.model || 'llama-3.3-70b-versatile').trim();
  const messages = body.messages || [];
  const maxTokens = body.max_tokens || 2500;
 
  if (!messages.length) {
    return res.status(400).json({ error: { message: 'No messages provided.' } });
  }
 
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_completion_tokens: maxTokens,
        temperature: 0.75
      })
    });
 
    const data = await response.json();
    return res.status(response.status).json(data);
 
  } catch (err) {
    return res.status(500).json({
      error: { message: 'Network error reaching Groq: ' + err.message }
    });
  }
}
