module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
 
  var email = req.query && req.query.email;
  if (!email) return res.status(400).json({ error: 'email required' });
 
  var REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
  var REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
 
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(200).json({ plan: 'free', source: 'no-redis' });
  }
 
  try {
    var r = await fetch(REDIS_URL + '/get/' + encodeURIComponent('ibg_pro:' + email.toLowerCase()), {
      headers: { Authorization: 'Bearer ' + REDIS_TOKEN }
    });
    var data = await r.json();
    return res.status(200).json({ plan: data.result === '1' ? 'pro' : 'free' });
  } catch(err) {
    return res.status(200).json({ plan: 'free', error: err.message });
  }
};
