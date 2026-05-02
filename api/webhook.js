const crypto = require('crypto');

// Disable Vercel's default body parser so we can verify the raw signature
module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise(function(resolve, reject) {
    var chunks = [];
    req.on('data', function(chunk) { chunks.push(chunk); });
    req.on('end', function() { resolve(Buffer.concat(chunks)); });
    req.on('error', reject);
  });
}

async function kv(method, key, value) {
  var base = process.env.UPSTASH_REDIS_REST_URL;
  var token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) return null;
  var path = method === 'SET'
    ? '/set/' + encodeURIComponent(key) + '/' + encodeURIComponent(value)
    : '/get/' + encodeURIComponent(key);
  var res = await fetch(base + path, {
    headers: { Authorization: 'Bearer ' + token }
  });
  return res.ok ? (await res.json()).result : null;
}

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var rawBody;
  try { rawBody = await readRawBody(req); }
  catch(e) { return res.status(400).json({ error: 'body read failed' }); }

  // Verify Lemon Squeezy HMAC-SHA256 signature
  var secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (secret) {
    var sig = req.headers['x-signature'] || '';
    var expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (sig !== expected) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  var event;
  try { event = JSON.parse(rawBody.toString('utf8')); }
  catch(e) { return res.status(400).json({ error: 'Invalid JSON' }); }

  var eventName = event && event.meta && event.meta.event_name;

  // Activate on successful payment events
  if (
    eventName === 'order_created' ||
    eventName === 'subscription_created' ||
    eventName === 'subscription_resumed'
  ) {
    var attrs = event.data && event.data.attributes;
    // Email from our custom checkout data (most reliable) or the order's user_email
    var email = (event.meta.custom_data && event.meta.custom_data.ibgenius_email) ||
                (attrs && attrs.user_email) || '';
    email = email.toLowerCase().trim();

    if (email) {
      var plan = eventName === 'subscription_resumed' ? 'pro' : 'pro';
      // Store: plan:<email> = pro, with 400-day TTL (covers annual plan)
      await kv('SET', 'plan:' + email, 'pro');
      // Also store the order/subscription ID for reference
      var orderId = (event.data && event.data.id) || '';
      await kv('SET', 'order:' + email, orderId);
      console.log('Activated Pro for', email, 'event:', eventName);
    }
  }

  // Deactivate on subscription cancellation/expiry
  if (
    eventName === 'subscription_cancelled' ||
    eventName === 'subscription_expired' ||
    eventName === 'subscription_paused'
  ) {
    var deattrs = event.data && event.data.attributes;
    var deemail = (event.meta.custom_data && event.meta.custom_data.ibgenius_email) ||
                  (deattrs && deattrs.user_email) || '';
    deemail = deemail.toLowerCase().trim();
    if (deemail) {
      await kv('SET', 'plan:' + deemail, 'free');
      console.log('Deactivated Pro for', deemail, 'event:', eventName);
    }
  }

  return res.status(200).json({ received: true });
};
