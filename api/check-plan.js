async function kv(key) {
  var base = process.env.UPSTASH_REDIS_REST_URL;
  var token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) return null;
  try {
    var res = await fetch(base + '/get/' + encodeURIComponent(key), {
      headers: { Authorization: 'Bearer ' + token }
    });
    return res.ok ? (await res.json()).result : null;
  } catch(e) { return null; }
}

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var email = (req.query && req.query.email) || '';
  if (!email) return res.status(400).json({ error: 'email required' });

  email = email.toLowerCase().trim();
  var plan = await kv('plan:' + email);
  return res.status(200).json({ plan: plan === 'pro' ? 'pro' : 'free' });
};
