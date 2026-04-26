module.exports = async function handler(req, res) {
  var secret = req.query && req.query.secret;
  var email  = req.query && req.query.email;
  var action = (req.query && req.query.action) || 'activate';
 
  var adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || secret !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!email) return res.status(400).json({ error: 'email required' });
 
  var REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
  var REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
 
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
      var r = await fetch(REDIS_URL + '/get/' + encodeURIComponent('ibg_pro:' + email.toLowerCase()), {
        headers: { Authorization: 'Bearer ' + REDIS_TOKEN }
      });
      var data = await r.json();
      return res.status(200).json({ email: email, plan: data.result === '1' ? 'pro' : 'free' });
    }
    return res.status(400).json({ error: 'action must be activate, deactivate, or check' });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
};
