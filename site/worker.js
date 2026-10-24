// Range requests for the landing's videos. Static assets on Workers always
// answer with the whole file, but Safari (and seeking anywhere) needs
// `206 Partial Content`. Only /media/* reaches this code (run_worker_first in
// wrangler.jsonc); everything else is served as plain static assets.
export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    const range = request.headers.get('range');
    const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m || res.status !== 200 || (m[1] === '' && m[2] === '')) return res;

    const body = await res.arrayBuffer();
    const size = body.byteLength;
    const start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]);
    const end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
    }
    const headers = new Headers(res.headers);
    headers.set('accept-ranges', 'bytes');
    headers.set('content-range', `bytes ${start}-${end}/${size}`);
    headers.set('content-length', String(end - start + 1));
    return new Response(body.slice(start, end + 1), { status: 206, headers });
  },
};
