// Cloudflare Pages Function contact handler. colecalfee.com is served by
// Cloudflare Pages; api/contact.js remains for the Vercel deployment.
// RESEND_API_KEY is configured privately as an encrypted Pages variable.

// 3000 characters of message plus an email address, with room for escaping.
const MAX_BODY = 16384;

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
  // Only the About page on this same host may post. Browsers always send
  // Origin on POST, so a missing one means a script. This stops casual
  // cross-site and scripted abuse; volume abuse with a forged Origin is left
  // to the zone's rate-limiting rule.
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return json(403, { error: 'Origin not allowed.' });
  }

  // The About page only sends JSON; refusing other types keeps cross-site
  // "simple" requests (text/plain, form posts) out entirely.
  const type = request.headers.get('Content-Type') || '';
  if (!/^application\/json\b/i.test(type)) {
    return json(415, { error: 'Invalid request.' });
  }

  // A real note fits well under MAX_BODY; refuse anything larger unread.
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY) {
    return json(413, { error: 'Message is too long.' });
  }

  const key = env.RESEND_API_KEY;
  if (!key) {
    return json(503, { error: 'Messaging is not configured yet.' });
  }

  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return json(413, { error: 'Message is too long.' });
    body = JSON.parse(text);
  } catch (_) { return json(400, { error: 'Invalid request.' }); }
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
