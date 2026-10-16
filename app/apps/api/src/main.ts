import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { AppModule } from './app.module.js';
import { MAX_PDF_BYTES } from './uploads.controller.js';
import { envKey } from './crypto.js';

try { process.loadEnvFile('../../.env'); } catch { /* env comes from the host (Docker) */ }

export async function createApp() {
  for (const k of ['PII_KEY', 'FILE_KEY', 'IP_HMAC_KEY'] as const) envKey(k); // fail fast on missing keys
  // TRUST_PROXY = number of proxy hops in front (1 = proxy manager, 2 = Cloudflare + proxy manager). A hop count, not `true`:
  // trusting every hop would let a client-sent X-Forwarded-For spoof req.ip (the rate-limit key)
  // (the adapter's type has no number form, so pass the trust function proxy-addr compiles a hop count into)
  const hops = Number(process.env.TRUST_PROXY ?? 0);
  const trustProxy = hops > 0 ? (_addr: string, i: number) => i < hops : false;
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ trustProxy, bodyLimit: 1024 * 1024 }), {
    logger: ['error', 'warn', 'log'],
  });
  await app.register(cookie);
  await app.register(cors, { origin: (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(','), credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], exposedHeaders: ['content-disposition'] });
  await app.register(multipart, { limits: { fileSize: MAX_PDF_BYTES, files: 1, fields: 5 } });
  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const app = await createApp();
  const port = Number(process.env.API_PORT ?? 4000);
  // '::' is dual-stack, so "localhost" → ::1 connects at once (IPv4-only cost ~200ms per request on Windows); fall back where IPv6 is off.
  await app.listen(port, '::').catch(() => app.listen(port, '0.0.0.0'));
}
