// Needs Postgres (docker compose up -d db) + migrated schema + app/.env.
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../src/main.js';
import { PrismaService } from '../src/prisma.service.js';
import { verifyChain } from '../src/crypto.js';

describe('auth e2e', () => {
  let app: NestFastifyApplication;
  const email = `e2e-${Date.now()}@firstjobjab.test`;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());

  it('register → login → me → logout', async () => {
    const f = app.getHttpAdapter().getInstance();
    const reg = await f.inject({ method: 'POST', url: '/auth/register', payload: { email, password: 'longpassword1', displayName: 'E2E' } });
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
    expect(me.json().user).toMatchObject({ email, hasPii: false });

    await f.inject({ method: 'POST', url: '/auth/logout', cookies: { sid: sid.value } });
    expect((await f.inject({ method: 'GET', url: '/auth/me', cookies: { sid: sid.value } })).statusCode).toBe(401);
  });

  it('audit log chain is intact', async () => {
    const rows = await app.get(PrismaService).auditLog.findMany({ orderBy: { id: 'asc' } });
    const entries = rows.map(({ id: _id, at, ...r }) => ({ ...r, at: at.toISOString() }));
    expect(verifyChain(entries)).toBe(-1);
  });
});
