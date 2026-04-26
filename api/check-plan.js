export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
 
  const email = req.query && req.query.email;
  if (!email) return res.status(400).json({ error: 'email required' });
 
  const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
 
  if (!REDIS_URL || !REDIS_TOKEN) {
    // Redis not configured - return free plan rather than erroring
    return res.status(200).json({ plan: 'free', source: 'no-redis' });
  }
 
  try {
    const r = await fetch(REDIS_URL + '/get/' + encodeURIComponent('ibg_pro:' + email.toLowerCase()), {
      headers: { Authorization: 'Bearer ' + REDIS_TOKEN }
    });
    const data = await r.json();
    const isPro = data.result === '1';
    return res.status(200).json({ plan: isPro ? 'pro' : 'free', email: email });
  } catch (err) {
    // If Redis fails, don't break the app — just return free
    return res.status(200).json({ plan: 'free', source: 'redis-error', error: err.message });
  }
}
