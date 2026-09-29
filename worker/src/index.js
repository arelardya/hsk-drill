// HSK Drill leaderboard API: GET /scores?level=1   POST /scores
const MODES = ['flash', 'write', 'quiz'];
const RATE_LIMIT = 5, RATE_WINDOW_MS = 10 * 60 * 1000;

const json = (data, status, cors) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...cors } });

const cleanName = v => String(v ?? '')
  .replace(/[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/g, '')
  .replace(/\s+/g, ' ').trim().slice(0, 24);

async function hashIp(ip, salt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ip));
  return [...new Uint8Array(buf)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Returns a clean row or null. Mirrors the client; the server is the one that counts.
function validate(b) {
  if (!b || typeof b !== 'object') return null;
  const name = cleanName(b.name);
  const level = b.level, total = b.total, correct = b.correct, pct = b.pct;
  const lessons = String(b.lessons ?? '');
  const ints = [level, total, correct, pct].every(Number.isInteger);
  if (!name || !ints || !MODES.includes(b.mode)) return null;
  if (level < 1 || level > 6 || total < 5 || total > 100 || correct < 0 || correct > total) return null;
  if (pct !== Math.round(correct * 100 / total)) return null;
  if (!/^(All|Trouble list|\d{1,2}(,\d{1,2}){0,39})$/.test(lessons)) return null;
  return { name, level, mode: b.mode, lessons, total, correct, pct };
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('origin') || '';
    const allowed = env.ALLOWED_ORIGINS.split(',');
    const cors = allowed.includes(origin)
      ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' }
      : { vary: 'origin' };
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname !== '/scores') return json({ error: 'not found' }, 404, cors);

    if (req.method === 'GET') {
      const level = Number(url.searchParams.get('level'));
      if (!Number.isInteger(level) || level < 1 || level > 6) return json({ error: 'bad level' }, 400, cors);
      const { results } = await env.DB.prepare(
        'SELECT name, level, mode, lessons, total, correct, pct, created_at FROM scores WHERE level = ? ORDER BY pct DESC, total DESC, created_at DESC LIMIT 20'
      ).bind(level).all();
      const res = json(results, 200, { ...cors, 'cache-control': 'public, max-age=15' });
      return res;
    }

    if (req.method === 'POST') {
      if (!allowed.includes(origin)) return json({ error: 'forbidden' }, 403, cors);
      if (Number(req.headers.get('content-length') || 0) > 2048) return json({ error: 'too large' }, 413, cors);
      let body; try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400, cors); }
      const row = validate(body);
      if (!row) return json({ error: 'invalid score' }, 422, cors);

      const ip = await hashIp(req.headers.get('cf-connecting-ip') || 'unknown', env.IP_SALT || 'hsk');
      const now = Date.now();
      const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE ip_hash = ? AND created_at > ?')
        .bind(ip, now - RATE_WINDOW_MS).first();
      if (n >= RATE_LIMIT) return json({ error: 'slow down' }, 429, cors);

      await env.DB.prepare(
        'INSERT INTO scores (created_at, name, level, mode, lessons, total, correct, pct, ip_hash) VALUES (?,?,?,?,?,?,?,?,?)'
      ).bind(now, row.name, row.level, row.mode, row.lessons, row.total, row.correct, row.pct, ip).run();
      return json({ ok: true }, 201, cors);
    }

    return json({ error: 'method not allowed' }, 405, cors);
  },
};
