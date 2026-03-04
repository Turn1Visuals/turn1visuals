/**
 * Twitch Live Status — Cloudflare Worker
 *
 * Deploy at: https://dash.cloudflare.com → Workers & Pages → Create Worker
 * Paste this file, then set these Secrets under Settings → Variables:
 *   TWITCH_CLIENT_ID     — from dev.twitch.tv
 *   TWITCH_CLIENT_SECRET — from dev.twitch.tv
 *   TWITCH_USER_LOGIN    — turn1visuals  (lowercase)
 *
 * The Worker URL will look like:
 *   https://twitch-status.<your-cf-subdomain>.workers.dev
 * Update WORKER_URL in linkinbio.astro and index.astro to match.
 */

const ALLOWED_ORIGINS = [
  'https://turn1visuals.com',
  'http://localhost:4321',
  'http://localhost:3000',
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(new Response(null, { status: 204 }), origin);
    }

    try {
      // 1. Obtain an App Access Token from Twitch
      const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id:     env.TWITCH_CLIENT_ID,
          client_secret: env.TWITCH_CLIENT_SECRET,
          grant_type:    'client_credentials',
        }),
      });

      if (!tokenRes.ok) throw new Error(`Token fetch failed: ${tokenRes.status}`);
      const { access_token } = await tokenRes.json();

      // 2. Check stream status
      const streamRes = await fetch(
        `https://api.twitch.tv/helix/streams?user_login=${env.TWITCH_USER_LOGIN}`,
        {
          headers: {
            'Client-ID':     env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${access_token}`,
          },
        }
      );

      if (!streamRes.ok) throw new Error(`Stream fetch failed: ${streamRes.status}`);
      const { data } = await streamRes.json();
      const stream = data?.[0] ?? null;

      const payload = JSON.stringify({
        live:    !!stream,
        title:   stream?.title   ?? null,
        viewers: stream?.viewer_count ?? null,
      });

      return corsResponse(
        new Response(payload, {
          headers: {
            'Content-Type':  'application/json',
            'Cache-Control': 's-maxage=60, stale-while-revalidate=30',
          },
        }),
        origin
      );

    } catch (err) {
      return corsResponse(
        new Response(JSON.stringify({ live: false, error: err.message }), {
          status: 200, // Return 200 so the site doesn't surface errors to visitors
          headers: { 'Content-Type': 'application/json' },
        }),
        origin
      );
    }
  },
};

function corsResponse(res, origin) {
  const response = new Response(res.body, res);
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  response.headers.set('Access-Control-Allow-Origin', allowed);
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  return response;
}
