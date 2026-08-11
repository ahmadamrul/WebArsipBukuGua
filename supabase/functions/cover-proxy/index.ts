// Supabase Edge Function: cover-proxy
// Fetches a comic cover image server-side (bypassing browser CORS) and
// returns the raw bytes so the client can cache it into Supabase Storage.
// Deploy with: supabase functions deploy cover-proxy

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const MAX_BYTES = 15 * 1024 * 1024; // 15MB safety cap

// Basic SSRF guard: reject obvious internal/loopback/link-local targets so this
// function can't be used to probe internal infra or cloud metadata endpoints.
// This is a hostname-based check, not a DNS-resolved one — it doesn't stop DNS
// rebinding, but Deno Deploy's network sandbox has no route to internal/tenant
// networks anyway, so this is defense-in-depth rather than the only barrier.
function isBlockedHostname(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '::1') return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (host === '0.0.0.0') return true;
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let targetUrl: string | undefined;
  try {
    const body = await req.json();
    targetUrl = body?.url;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing url' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid url' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return new Response(JSON.stringify({ error: 'Unsupported protocol' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (isBlockedHostname(parsed.hostname)) {
    return new Response(JSON.stringify({ error: 'Target host not allowed' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let upstream: Response;
    try {
      upstream = await fetch(parsed.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          Referer: `${parsed.protocol}//${parsed.hostname}/`,
        },
        redirect: 'follow',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: `Upstream responded with ${upstream.status}` }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
      return new Response(JSON.stringify({ error: `Unexpected content-type: ${contentType}` }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) {
      return new Response(JSON.stringify({ error: 'Image size out of bounds' }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(buffer, {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': contentType },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Fetch failed: ${String(error)}` }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
