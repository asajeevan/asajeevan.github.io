/**
 * Visitor counter for a static site (Cloudflare Worker + KV).
 *
 * Routes
 *   GET /hit    increments the counter and returns {"count": n}
 *   GET /count  returns the current value without incrementing
 *
 * Bindings (set in the Cloudflare dashboard, Worker > Settings)
 *   KV namespace  VISITS
 *   Variable      ALLOWED_ORIGIN   e.g. https://<username>.github.io
 *
 * Free tier: 100,000 requests and 1,000 KV writes per day, far more than a
 * personal site needs. Each new visit costs one write; reads are free.
 */

const KEY = 'total';

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|monitor/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN || '*';

    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': allowed === '*' ? '*' : (origin === allowed ? allowed : 'null'),
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405, headers);

    // Only answer the site that owns the counter
    if (allowed !== '*' && origin && origin !== allowed) return json({ error: 'forbidden' }, 403, headers);

    let count = parseInt(await env.VISITS.get(KEY), 10) || 0;

    if (url.pathname === '/hit') {
      const ua = request.headers.get('User-Agent') || '';
      if (!BOT.test(ua)) {
        count += 1;
        await env.VISITS.put(KEY, String(count));
      }
      return json({ count }, 200, headers);
    }

    if (url.pathname === '/count') return json({ count }, 200, headers);

    return json({ error: 'not found', routes: ['/hit', '/count'] }, 404, headers);
  }
};

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}
