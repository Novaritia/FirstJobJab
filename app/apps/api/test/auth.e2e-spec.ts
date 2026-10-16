// Needs Postgres (docker compose up -d db) + migrated schema + app/.env.
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../src/main.js';
import { PrismaService } from '../src/prisma.service.js';
import { verifyChain } from '../src/crypto.js';
import { PRIVACY_VERSION, TERMS_VERSION } from '../src/security-util.js';

describe('auth e2e', () => {
  let app: NestFastifyApplication;
  const email = `e2e-${Date.now()}@firstjobjab.test`;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());

  it('register → login → me → security → delete account', async () => {
    const f = app.getHttpAdapter().getInstance();
    const reg = await f.inject({ method: 'POST', url: '/auth/register', payload: { email, password: 'longpassword1', displayName: 'E2E', acceptTerms: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION } });
    expect(reg.statusCode).toBe(201);
    expect(reg.json().user.email).toBe(email);

    const bad = await f.inject({ method: 'POST', url: '/auth/login', payload: { email, password: 'wrong-password' } });
    expect(bad.statusCode).toBe(401);
    expect(bad.json()).toEqual({ error: 'invalid_credentials' });

    const login = await f.inject({ method: 'POST', url: '/auth/login', payload: { email, password: 'longpassword1' } });
    expect(login.statusCode).toBe(200);
    const sid = login.cookies.find((c) => c.name === 'sid')!;
    expect(sid.httpOnly).toBe(true);

    const me = await f.inject({ method: 'GET', url: '/auth/me', cookies: { sid: sid.value } });
    expect(me.statusCode).toBe(200);
    expect(me.json().user).toMatchObject({ email, hasPii: false, needsReconsent: false });

    const noTerms = await f.inject({ method: 'POST', url: '/auth/register', payload: { email: `x${email}`, password: 'longpassword1', displayName: 'X' } });
    expect(noTerms.statusCode).toBe(400);
    const withdraw = await f.inject({ method: 'PUT', url: '/profile/consents', cookies: { sid: sid.value }, payload: { purpose: 'terms', granted: false } });
    expect(withdraw.json()).toEqual({ error: 'required_consent' });
    const logins = (await f.inject({ method: 'GET', url: '/security/logins', cookies: { sid: sid.value } })).json().logins;
    expect(logins.map((l: { success: boolean }) => l.success)).toEqual([true, false, true]);
    expect(logins[0]).toMatchObject({ current: true, location: 'เครือข่ายภายใน' });

    const put = await f.inject({ method: 'PUT', url: '/profile', cookies: { sid: sid.value }, payload: { phone: '0812345678', nationalId: '1103700123458', monthlySalary: 25000 } });
    expect(put.json()).toMatchObject({ displayName: 'E2E', email, phone: '0812345678', nationalIdMasked: 'x-xxxx-xxxxx-45-8', hasNationalId: true, birthDate: null, monthlySalary: 2500000 });
    expect(JSON.stringify(put.json())).not.toContain('1103700123458');
    const badPut = await f.inject({ method: 'PUT', url: '/profile', cookies: { sid: sid.value }, payload: { phone: '12' } });
    expect(badPut.json()).toEqual({ error: 'invalid_profile', fields: { phone: 'invalid_phone' } });
    const cleared = (await f.inject({ method: 'PUT', url: '/profile', cookies: { sid: sid.value }, payload: { nationalId: null } })).json();
    expect(cleared).toMatchObject({ hasNationalId: false, nationalIdMasked: null, phone: '0812345678' });
    const page = (await f.inject({ method: 'GET', url: '/audit?limit=1&page=2', cookies: { sid: sid.value } })).json();
    expect(page.entries).toHaveLength(1);
    expect(page.total).toBeGreaterThan(2);
    expect((await f.inject({ method: 'GET', url: '/security/logins?limit=2', cookies: { sid: sid.value } })).json()).toMatchObject({ total: 3 });

    const del = await f.inject({ method: 'DELETE', url: '/account', cookies: { sid: sid.value }, payload: { password: 'longpassword1' } });
    expect(del.statusCode).toBe(200);
    expect((await f.inject({ method: 'GET', url: '/auth/me', cookies: { sid: sid.value } })).statusCode).toBe(401);
    expect((await f.inject({ method: 'POST', url: '/auth/login', payload: { email, password: 'longpassword1' } })).statusCode).toBe(401);
  });

  it('audit log chain is intact', async () => {
    const rows = await app.get(PrismaService).auditLog.findMany({ orderBy: { id: 'asc' } });
    const entries = rows.map(({ id: _id, at, ...r }) => ({ ...r, at: at.toISOString() }));
    expect(verifyChain(entries)).toBe(-1);
  });
});
