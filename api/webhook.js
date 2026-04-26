const crypto = require('crypto');
 
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
 
  const secret    = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  const signature = req.headers['x-signature'];
  const body      = JSON.stringify(req.body);
 
  // Verify signature if secret is set
  if (secret && signature) {
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (expected !== signature) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }
 
  const event = req.body.meta && req.body.meta.event_name;
  // We pass ibgenius_email via checkout URL custom data
  const customData = req.body.meta && req.body.meta.custom_data;
  const email = (customData && customData.ibgenius_email) ||
                (req.body.data && req.body.data.attributes && req.body.data.attributes.user_email);
 
  console.log('Webhook event:', event, '| email:', email);
 
  if (!email) return res.status(400).json({ error: 'No email found in payload' });
 
  const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
 
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.error('Upstash credentials not set');
    return res.status(500).json({ error: 'Redis not configured' });
  }
 
  async function redisSet(key, value) {
    const r = await fetch(REDIS_URL + '/set/' + encodeURIComponent(key) + '/' + encodeURIComponent(value), {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + REDIS_TOKEN }
    });
    return r.json();
  }
 
  async function redisDel(key) {
    const r = await fetch(REDIS_URL + '/del/' + encodeURIComponent(key), {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + REDIS_TOKEN }
    });
    return r.json();
  }
 
  const activateEvents = ['subscription_created', 'subscription_updated', 'order_created'];
  const cancelEvents   = ['subscription_cancelled', 'subscription_expired', 'subscription_paused'];
 
  if (activateEvents.includes(event)) {
    const status = req.body.data && req.body.data.attributes && req.body.data.attributes.status;
    // For orders (one-time) always activate. For subscriptions check status is active.
    if (event === 'order_created' || status === 'active') {
      await redisSet('ibg_pro:' + email.toLowerCase(), '1');
      console.log('Activated Pro for:', email);
    }
  } else if (cancelEvents.includes(event)) {
    await redisDel('ibg_pro:' + email.toLowerCase());
    console.log('Deactivated Pro for:', email);
  }
 
  return res.status(200).json({ received: true, event: event, email: email });
}
