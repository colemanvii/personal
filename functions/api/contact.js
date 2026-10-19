// Cloudflare Pages Function contact handler. colecalfee.com is served by
// Cloudflare Pages; api/contact.js remains for the Vercel deployment.
// RESEND_API_KEY is configured privately as an encrypted Pages variable.
const ORIGINS = new Set([
  'https://colecalfee.com',
  'https://www.colecalfee.com',
  'https://personal-7jh.pages.dev'
]);
// Branch and commit previews: https://<label>.personal-7jh.pages.dev
const PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+\.personal-7jh\.pages\.dev$/;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

// The About page asks before showing the form, so a visitor never writes a
// note that cannot be delivered. Reports only whether delivery is configured.
export function onRequestGet({ env }) {
  return json(200, { configured: Boolean(env.RESEND_API_KEY) });
}

export async function onRequestPost({ request, env }) {
  // Browser-origin check limits casual cross-site form abuse.
  const origin = request.headers.get('Origin');
  if (origin && !ORIGINS.has(origin) && !PREVIEW_ORIGIN.test(origin)) {
    return json(403, { error: 'Origin not allowed.' });
  }

  const key = env.RESEND_API_KEY;
  if (!key) {
    return json(503, { error: 'Messaging is not configured yet.' });
  }

  let body;
  try { body = await request.json(); }
  catch (_) { return json(400, { error: 'Invalid request.' }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json(400, { error: 'Invalid request.' });
  }

  // Honeypot; accept silently but don't send.
  if (body.website) return json(200, { ok: true });

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  // Limit reply addresses to a single syntactically valid mailbox.
  if (email.length > 254 || !/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(email)) {
    return json(400, { error: 'Please enter a valid email address.' });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (message.length < 3 || message.length > 3000) {
    return json(400, { error: 'Please write a message between 3 and 3000 characters.' });
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
      return json(502, { error: 'Message could not be delivered. Please try again.' });
    }
    return json(200, { ok: true });
  } catch (error) {
    console.error('Contact delivery failed', (error && error.name) || 'unknown');
    return json(502, { error: 'Message could not be delivered. Please try again.' });
  }
}
