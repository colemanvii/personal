// Vercel serverless contact handler. RESEND_API_KEY is configured privately in Vercel.
const ORIGINS = new Set([
  'https://colecalfee.com',
  'https://www.colecalfee.com',
  'https://colecalfee.vercel.app'
]);

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // The About page asks before showing the form; report only whether delivery is configured.
  if (req.method === 'GET') {
    return res.status(200).json({ configured: Boolean(process.env.RESEND_API_KEY) });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // Browser-origin check limits casual cross-site form abuse.
  const origin = req.headers.origin;
  if (origin && !ORIGINS.has(origin)) {
    return res.status(403).json({ error: 'Origin not allowed.' });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return res.status(503).json({ error: 'Messaging is not configured yet.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch (_) { return res.status(400).json({ error: 'Invalid request.' }); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  // Honeypot; accept silently but don't send.
  if (body.website) return res.status(200).json({ ok: true });

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  // Limit reply addresses to a single syntactically valid mailbox.
  if (email.length > 254 || !/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (message.length < 3 || message.length > 3000) {
    return res.status(400).json({ error: 'Please write a message between 3 and 3000 characters.' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Cole Calfee Website <contact@colecalfee.com>',
        to: ['colecalfee@gmail.com'],
        reply_to: email,
        subject: 'New note from colecalfee.com',
        text: 'Reply to: ' + email + '\n\n' + message
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      // Never surface provider credentials or internal error content to visitors.
      console.error('Contact email provider returned status', response.status);
      return res.status(502).json({ error: 'Message could not be delivered. Please try again.' });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Contact delivery failed', error?.name || 'unknown');
    return res.status(502).json({ error: 'Message could not be delivered. Please try again.' });
  }
};
