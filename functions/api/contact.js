/* Contact form endpoint: a Cloudflare Pages Function at /api/contact.
 *
 * The About page posts a note here; it is sent to Cole by Resend from
 * contact@colecalfee.com, with the visitor's address as Reply-To.
 * RESEND_API_KEY is a Cloudflare Pages secret (Settings → Variables and
 * Secrets, for Production and Preview); it never reaches the browser.
 *
 * Spam protection, all server-side: a hidden honeypot field, a minimum
 * time on the page before sending, a same-site Origin check, and size
 * limits. The page shows success only when this returns {ok: true}. */

const TO = "colecalfee@gmail.com";
const FROM = "Cole Calfee Website <contact@colecalfee.com>";
const MIN_ELAPSED_MS = 3000;
const MAX_BODY_BYTES = 10000;
const EMAIL = /^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/;

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: {"Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"}
});

export async function onRequestPost({request, env}) {
  // Only this site's own pages may post: production, www, and its previews.
  const origin = request.headers.get("Origin");
  if (!origin || origin !== new URL(request.url).origin) return json(403, {error: "Origin not allowed."});

  if (!env.RESEND_API_KEY) return json(503, {error: "Messaging is not configured yet."});

  if (Number(request.headers.get("Content-Length") || 0) > MAX_BODY_BYTES) return json(413, {error: "That note is too long."});
  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return json(413, {error: "That note is too long."});
    body = JSON.parse(text);
  } catch (_) {
    return json(400, {error: "Invalid request."});
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json(400, {error: "Invalid request."});

  // A person never fills the hidden field: accept quietly and send nothing.
  if (body.website) return json(200, {ok: true});

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (email.length > 254 || !EMAIL.test(email)) return json(400, {error: "Please enter a valid email address."});

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 3 || message.length > 5000) return json(400, {error: "Please write a note between 3 and 5,000 characters."});

  // Scripts post the instant a page loads; people take a few seconds to write.
  if (!(Number(body.elapsed) >= MIN_ELAPSED_MS)) return json(400, {error: "Please take a moment before sending."});

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json"},
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,
        subject: "New note from colecalfee.com",
        text: `Reply to: ${email}\n\n${message}`
      }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      // Never pass the provider's response or credentials back to visitors.
      console.error("Contact email provider returned status", response.status);
      return json(502, {error: "Your note could not be sent. Please try again, or write to " + TO + "."});
    }
    return json(200, {ok: true});
  } catch (error) {
    console.error("Contact delivery failed", error?.name || "unknown");
    return json(502, {error: "Your note could not be sent. Please try again, or write to " + TO + "."});
  }
}

export function onRequest() {
  return new Response(null, {status: 405, headers: {Allow: "POST", "Cache-Control": "no-store"}});
}
