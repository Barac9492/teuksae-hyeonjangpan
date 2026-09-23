import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const COOKIE_NAME = '__Host-woori_admin';
export const SESSION_SECONDS = 2 * 60 * 60;
const MAX_BODY_BYTES = 2048;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
// Defense in depth only: this warm-instance map is not a distributed limiter.
// Production /admin and /api/admin/* also require a Vercel Firewall browser challenge.
const attempts = new Map();

function config(env) {
  const username = (env.ADMIN_LOGIN_ID || '').trim().toUpperCase();
  const passwordHash = env.ADMIN_PASSWORD_SCRYPT || '';
  const sessionSecret = env.ADMIN_SESSION_SECRET || '';
  let origin;
  try { origin = new URL(env.ADMIN_ALLOWED_ORIGIN || '').origin; } catch { return null; }
  if (!username || username.length > 80 || !/^[A-Za-z0-9_-]{64,}$/.test(sessionSecret) || !/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{64}$/.test(passwordHash) || !origin.startsWith('https://')) return null;
  return { username, passwordHash, sessionSecret, origin };
}

function safeEqual(a, b) {
  const left = createHash('sha256').update(String(a)).digest();
  const right = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(left, right);
}

function reply(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Vary', 'Cookie, Origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function cookie(value, age) {
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
}

function clearSession(res) { res.setHeader('Set-Cookie', cookie('', 0)); }

function issueSession(username, secret, now) {
  const payload = Buffer.from(JSON.stringify({ v: 1, sub: username, iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + SESSION_SECONDS, nonce: randomBytes(24).toString('base64url') })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readSession(req, cfg, now = Date.now()) {
  const header = req.headers?.cookie || '';
  if (typeof header !== 'string' || header.length > 8192) return null;
  const matches = header.split(';').map((part) => part.trim()).filter((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(COOKIE_NAME.length + 1);
  if (token.length > 2048) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return null;
  const expected = createHmac('sha256', cfg.sessionSecret).update(parts[0]).digest('base64url');
  if (!safeEqual(parts[1], expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const seconds = Math.floor(now / 1000);
    if (payload.v !== 1 || !safeEqual(payload.sub, cfg.username) || !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) || payload.iat > seconds + 30 || payload.exp <= seconds || payload.exp - payload.iat !== SESSION_SECONDS || !/^[A-Za-z0-9_-]{32}$/.test(payload.nonce || '')) return null;
    return { username: cfg.username, expiresAt: new Date(payload.exp * 1000).toISOString() };
  } catch { return null; }
}

async function jsonBody(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type'] || '')) throw new Error('unsupported');
  const declaredLength = Number(req.headers?.['content-length'] || 0);
  if (!Number.isFinite(declaredLength) || declaredLength > MAX_BODY_BYTES) throw new Error('too-large');
  let value = req.body;
  if (value === undefined) {
    let raw = '';
    for await (const chunk of req) { raw += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk); if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw new Error('too-large'); }
    value = raw;
  }
  if (Buffer.isBuffer(value)) value = value.toString('utf8');
  if (typeof value === 'string') { if (Buffer.byteLength(value) > MAX_BODY_BYTES) throw new Error('too-large'); value = JSON.parse(value); }
  if (!value || typeof value !== 'object' || Array.isArray(value) || Buffer.byteLength(JSON.stringify(value)) > MAX_BODY_BYTES) throw new Error('bad-body');
  return value;
}

function throttleKey(req, cfg) {
  // Never persist or log the raw address. At the edge, Vercel supplies the connection identity.
  const address = req.headers?.['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  return createHmac('sha256', cfg.sessionSecret).update(String(address)).digest('hex');
}

function retrySeconds(key, now) {
  for (const [id, entry] of attempts) if (entry.until <= now) attempts.delete(id);
  const entry = attempts.get(key);
  return entry && entry.count >= MAX_ATTEMPTS ? Math.max(1, Math.ceil((entry.until - now) / 1000)) : 0;
}

function markAttempt(key, now) {
  const entry = attempts.get(key);
  if (entry) entry.count += 1;
  else attempts.set(key, { count: 1, until: now + ATTEMPT_WINDOW_MS });
}

export async function handleAdmin(action, req, res, env = process.env, now = Date.now()) {
  const expectedMethod = action === 'login' || action === 'logout' ? 'POST' : 'GET';
  // Do not allow alternate paths to bypass the edge rule matching this exact API route.
  let pathname;
  try { pathname = new URL(req.url || '', 'https://internal.invalid').pathname; } catch { return reply(res, 400, { error: '요청을 확인해주세요.' }); }
  if (pathname !== `/api/admin/${action}`) return reply(res, 404, { error: '찾을 수 없는 요청입니다.' });
  if (req.method !== expectedMethod) { res.setHeader('Allow', expectedMethod); return reply(res, 405, { error: '허용되지 않은 요청입니다.' }); }
  const cfg = config(env);
  if (!cfg) { clearSession(res); return reply(res, 503, { authenticated: false, error: '관리자 인증 설정을 확인 중입니다.' }); }
  if (expectedMethod === 'POST') {
    if (req.headers?.origin !== cfg.origin || req.headers?.['sec-fetch-site'] === 'cross-site') return reply(res, 403, { authenticated: false, error: '같은 사이트에서 다시 시도해주세요.' });
  } else if (req.headers?.['sec-fetch-site'] === 'cross-site') return reply(res, 403, { authenticated: false, error: '허용되지 않은 요청입니다.' });

  if (action === 'login') {
    const key = throttleKey(req, cfg);
    const wait = retrySeconds(key, now);
    if (wait) { res.setHeader('Retry-After', String(wait)); return reply(res, 429, { authenticated: false, error: '로그인 시도가 많습니다. 잠시 후 다시 시도해주세요.', retryAfter: wait }); }
    if (attempts.size >= 10000 && !attempts.has(key)) { res.setHeader('Retry-After', '60'); return reply(res, 503, { authenticated: false, error: '잠시 후 다시 시도해주세요.' }); }
    let body;
    try { body = await jsonBody(req); } catch { markAttempt(key, now); return reply(res, 400, { authenticated: false, error: '로그인 요청을 확인해주세요.' }); }
    if (typeof body.username !== 'string' || typeof body.password !== 'string' || body.username.length > 80 || body.password.length > 256 || body.password.length < 1) { markAttempt(key, now); return reply(res, 400, { authenticated: false, error: '아이디와 비밀번호를 입력해주세요.' }); }
    try {
      const [, salt, hash] = cfg.passwordHash.split('$');
      const actual = scryptSync(body.password, Buffer.from(salt, 'hex'), 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
      const passwordValid = timingSafeEqual(actual, Buffer.from(hash, 'hex'));
      const usernameValid = safeEqual(body.username.trim().toUpperCase(), cfg.username);
      if (!passwordValid || !usernameValid) { markAttempt(key, now); clearSession(res); return reply(res, 401, { authenticated: false, error: '아이디 또는 비밀번호를 확인해주세요.' }); }
      attempts.delete(key);
      res.setHeader('Set-Cookie', cookie(issueSession(cfg.username, cfg.sessionSecret, now), SESSION_SECONDS));
      return reply(res, 200, { authenticated: true, username: cfg.username, expiresAt: new Date((Math.floor(now / 1000) + SESSION_SECONDS) * 1000).toISOString() });
    } catch { return reply(res, 503, { authenticated: false, error: '로그인을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.' }); }
  }

  if (action === 'logout') {
    try { await jsonBody(req); } catch { return reply(res, 400, { error: '로그아웃 요청을 확인해주세요.' }); }
    clearSession(res);
    return reply(res, 200, { authenticated: false });
  }

  const session = readSession(req, cfg, now);
  if (!session) { clearSession(res); return reply(res, 401, { authenticated: false, error: '관리자 로그인이 필요합니다.' }); }
  if (action === 'session') return reply(res, 200, { authenticated: true, ...session });
  if (action === 'dashboard') return reply(res, 200, { authenticated: true, ...session, capabilities: { liveOperations: false, photoReview: false, prayerInbox: false, sharingModeration: false } });
  return reply(res, 404, { error: '찾을 수 없는 요청입니다.' });
}
