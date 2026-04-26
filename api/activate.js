export default async function handler(req, res) {
  // Simple admin activation endpoint
  // Usage: /api/activate?secret=YOUR_ADMIN_SECRET&email=user@example.com&action=activate
  
  const secret = req.query && req.query.secret;
  const email  = req.query && req.query.email;
  const action = (req.query && req.query.action) || 'activate';
 
  // Check admin secret
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || secret !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
 
  if (!email) {
    return res.status(400).json({ error: 'email required' });
  }
 
  const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
 
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Redis not configured' });
  }
 
  try {
    if (action === 'activate') {
      await fetch(REDIS_URL + '/set/' + encodeURIComponent('ibg_pro:' + email.toLowerCase()) + '/1', {
        headers: { Authorization: 'Bearer ' + REDIS_TOKEN }
      });
      return res.status(200).json({ success: true, message: 'Pro activated for ' + email });
    }
 
    if (action === 'deactivate') {
      await fetch(REDIS_URL + '/del/' + encodeURIComponent('ibg_pro:' + email.toLowerCase()), {
        headers: { Authorization: 'Bearer ' + REDIS_TOKEN }
      });
      return res.status(200).json({ success: true, message: 'Pro deactivated for ' + email });
    }
 
    if (action === 'check') {
      const r = await fetch(REDIS_URL + '/get/' + encodeURIComponent('ibg_pro:' + email.toLowerCase()), {
        headers: { Authorization: 'Bearer ' + REDIS_TOKEN }
      });
      const data = await r.json();
      return res.status(200).json({ email: email, plan: data.result === '1' ? 'pro' : 'free' });
    }
 
    return res.status(400).json({ error: 'action must be activate, deactivate, or check' });
 
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
