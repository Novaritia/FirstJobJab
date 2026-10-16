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
  // TRUST_PROXY=1 only behind a real proxy (Cloudflare); otherwise X-Forwarded-For could spoof the rate-limit key
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ trustProxy: process.env.TRUST_PROXY === '1', bodyLimit: 1024 * 1024 }), {
    logger: ['error', 'warn', 'log'],
  });
  await app.register(cookie);
  await app.register(cors, { origin: (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(','), credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] });
  await app.register(multipart, { limits: { fileSize: MAX_PDF_BYTES, files: 1, fields: 5 } });
  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const app = await createApp();
  await app.listen(Number(process.env.API_PORT ?? 4000), '0.0.0.0');
}
