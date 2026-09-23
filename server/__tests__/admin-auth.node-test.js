import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import { COOKIE_NAME, SESSION_SECONDS, handleAdmin } from '../admin-auth.js';

const salt = randomBytes(16);
const fixturePassword = 'unit-test-only-not-a-real-password';
const env = {
  ADMIN_LOGIN_ID: 'FIXTURE_ADMIN',
  ADMIN_PASSWORD_SCRYPT: `scrypt$${salt.toString('hex')}$${scryptSync(fixturePassword, salt, 32).toString('hex')}`,
  ADMIN_SESSION_SECRET: randomBytes(48).toString('base64url'),
  ADMIN_ALLOWED_ORIGIN: 'https://fixture.example',
};
const now = Date.now();
let ipSequence = 0;
async function call(action, options = {}) {
  const headers = { origin: env.ADMIN_ALLOWED_ORIGIN, 'content-type': 'application/json', ...options.headers };
  const req = { method: action === 'login' || action === 'logout' ? 'POST' : 'GET', url: `/api/admin/${action}`, headers, socket: { remoteAddress: options.ip || `fixture-${++ipSequence}` }, body: options.body ?? {}, ...options.req };
  const responseHeaders = {};
  const res = { statusCode: 0, setHeader(key, value) { responseHeaders[key.toLowerCase()] = value; }, end(value) { this.body = JSON.parse(value); } };
  await handleAdmin(action, req, res, options.env || env, options.now ?? now);
  return { status: res.statusCode, body: res.body, headers: responseHeaders };
}
const valid = { username: env.ADMIN_LOGIN_ID.toLowerCase(), password: fixturePassword };
async function authenticatedCookie() { const result = await call('login', { body: valid }); assert.equal(result.status, 200); return result.headers['set-cookie'].split(';')[0]; }

test('missing, weak, or malformed configuration fails closed', async () => {
  for (const broken of [{}, { ...env, ADMIN_SESSION_SECRET: 'weak' }, { ...env, ADMIN_PASSWORD_SCRYPT: 'not-a-hash' }, { ...env, ADMIN_ALLOWED_ORIGIN: 'http://fixture.example' }]) {
    const result = await call('login', { body: valid, env: broken });
    assert.equal(result.status, 503); assert.equal(result.body.authenticated, false); assert.match(result.headers['set-cookie'], /Max-Age=0/);
  }
});

test('only correct credentials issue a secure, host-scoped, short-lived cookie', async () => {
  const result = await call('login', { body: valid });
  assert.equal(result.status, 200); assert.equal(result.body.authenticated, true); assert.equal(result.body.username, env.ADMIN_LOGIN_ID);
  assert.match(result.headers['set-cookie'], new RegExp(`^${COOKIE_NAME}=`));
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/', `Max-Age=${SESSION_SECONDS}`]) assert.ok(result.headers['set-cookie'].includes(attribute));
  assert.ok(!result.headers['set-cookie'].includes('Domain=')); assert.ok(!JSON.stringify(result.body).includes(fixturePassword));
  assert.equal(Date.parse(result.body.expiresAt), (Math.floor(now / 1000) + SESSION_SECONDS) * 1000);
});

test('wrong username and wrong password return the same generic failure', async () => {
  const one = await call('login', { body: { ...valid, username: 'NOT_THE_ACCOUNT' } });
  const two = await call('login', { body: { ...valid, password: 'incorrect-fixture' } });
  assert.equal(one.status, 401); assert.equal(two.status, 401); assert.deepEqual(one.body, two.body);
  assert.match(two.headers['set-cookie'], /Max-Age=0/);
});

test('untrusted or absent Origin and cross-site writes are rejected', async () => {
  for (const headers of [{ origin: 'https://attacker.example' }, { origin: undefined }, { 'sec-fetch-site': 'cross-site' }]) {
    for (const action of ['login', 'logout']) assert.equal((await call(action, { body: valid, headers })).status, 403);
  }
});

test('method and alternate-path bypasses are rejected', async () => {
  assert.equal((await call('login', { req: { method: 'GET' }, body: valid })).status, 405);
  assert.equal((await call('session', { req: { method: 'POST' } })).status, 405);
  for (const url of ['/api/admin/login/', '/api/admin/LOGIN', '/api/admin/%6Cogin', '/elsewhere']) assert.equal((await call('login', { body: valid, req: { url } })).status, 404);
});

test('malformed, oversized and non-JSON login requests fail safely', async () => {
  for (const options of [{ body: '{broken' }, { body: [] }, { body: { username: {}, password: fixturePassword } }, { body: { ...valid, password: 'x'.repeat(300) } }, { body: valid, headers: { 'content-length': '9000' } }, { body: valid, headers: { 'content-type': 'text/plain' } }]) assert.equal((await call('login', options)).status, 400);
});

test('five failed attempts block the warm-instance client, then expire', async () => {
  const ip = 'dedicated-throttle-fixture';
  for (let i = 0; i < 5; i += 1) assert.equal((await call('login', { ip, body: { ...valid, password: 'incorrect-fixture' } })).status, 401);
  const limited = await call('login', { ip, body: valid });
  assert.equal(limited.status, 429); assert.equal(limited.body.retryAfter, 900); assert.equal(limited.headers['retry-after'], '900');
  assert.equal((await call('login', { ip, body: valid, now: now + 901000 })).status, 200);
});

test('protected APIs reject missing, forged, and duplicate session cookies', async () => {
  const cookie = await authenticatedCookie();
  for (const bad of ['', `${COOKIE_NAME}=pretend-admin`, `${cookie}x`, `${cookie}; ${cookie}`, `${COOKIE_NAME}=true`]) {
    for (const action of ['session', 'dashboard']) assert.equal((await call(action, { headers: { cookie: bad } })).status, 401);
  }
});

test('protected APIs accept a valid cookie, expose no auth secrets, and keep operations disconnected', async () => {
  const cookie = await authenticatedCookie();
  const session = await call('session', { headers: { cookie } });
  assert.equal(session.status, 200); assert.equal(session.body.authenticated, true);
  const dashboard = await call('dashboard', { headers: { cookie } });
  assert.equal(dashboard.status, 200); assert.deepEqual(Object.values(dashboard.body.capabilities), [false, false, false, false]);
  const json = JSON.stringify(dashboard.body);
  for (const secret of [fixturePassword, env.ADMIN_PASSWORD_SCRYPT, env.ADMIN_SESSION_SECRET]) assert.ok(!json.includes(secret));
  assert.equal(dashboard.headers['cache-control'], 'private, no-store, max-age=0');
});

test('expired, future-issued, rotated-key, and renamed-account sessions fail closed', async () => {
  const cookie = await authenticatedCookie();
  for (const options of [{ now: now + SESSION_SECONDS * 1000 }, { now: now - 60000 }, { env: { ...env, ADMIN_SESSION_SECRET: randomBytes(48).toString('base64url') } }, { env: { ...env, ADMIN_LOGIN_ID: 'OTHER_ACCOUNT' } }]) assert.equal((await call('dashboard', { ...options, headers: { cookie } })).status, 401);
});

test('logout expires browser cookie and unauthenticated access remains denied', async () => {
  const cookie = await authenticatedCookie();
  const result = await call('logout', { headers: { cookie } });
  assert.equal(result.status, 200); assert.equal(result.body.authenticated, false); assert.match(result.headers['set-cookie'], /Max-Age=0/);
  assert.equal((await call('dashboard', { headers: { cookie: `${COOKIE_NAME}=` } })).status, 401);
  assert.equal((await call('logout')).status, 200);
});

test('all response classes are JSON and explicitly non-cacheable', async () => {
  for (const result of [await call('session'), await call('login', { body: valid }), await call('login', { env: {} }), await call('logout')]) {
    assert.match(result.headers['content-type'], /^application\/json/); assert.match(result.headers['cache-control'], /no-store/);
  }
});
