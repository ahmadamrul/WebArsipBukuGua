const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const allowedHosts = [
  'assets.shngm.id',
  'thumbnail.komiku.org',
  'komiku.org',
  'webtoon-phinf.pstatic.net',
  'i0.wp.com',
  'www.maid.my.id',
  'jumpg-assets.tokyo-cdn.com',
];

function hostIsAllowed(hostname: string) {
  const normalized = hostname.toLowerCase();
  return allowedHosts.some((host) => normalized === host || normalized.endsWith(`.${host}`));
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await request.json()) as { url?: string };
    const target = new URL(body.url ?? '');
    if (target.protocol !== 'https:' || !hostIsAllowed(target.hostname)) {
      return new Response(JSON.stringify({ error: 'Host gambar tidak diizinkan.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const referer = target.hostname.endsWith('shngm.id')
      ? 'https://11.shinigami.asia/'
      : target.hostname === 'jumpg-assets.tokyo-cdn.com'
        ? 'https://mangaplus.shueisha.co.jp/'
        : `${target.protocol}//${target.hostname}/`;
    const imageResponse = await fetch(target, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        Referer: referer,
        'User-Agent': 'Mozilla/5.0 (compatible; ArsipBukuGua/1.0)',
      },
    });
    if (!imageResponse.ok) {
      return new Response(JSON.stringify({ error: `Sumber gambar merespons ${imageResponse.status}.` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(await imageResponse.arrayBuffer(), {
      headers: {
        ...corsHeaders,
        'Content-Type': imageResponse.headers.get('content-type') ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'URL gambar tidak valid.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
