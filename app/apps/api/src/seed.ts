// Demo user: demo@firstjobjab.app / demo1234 (+ PII from mock-data/persona.json if present, so mock PDFs auto-unlock).
import { existsSync, readFileSync } from 'node:fs';
import * as argon2 from 'argon2';
import { PrismaService } from './prisma.service.js';
import { encryptStr, envKey } from './crypto.js';
import { acceptConsents, needsReconsent } from './security-util.js';

try { process.loadEnvFile('../../.env'); } catch { /* host env */ }

const prisma = new PrismaService();
const email = 'demo@firstjobjab.app';
const user = await prisma.user.upsert({
  where: { email },
  create: { email, displayName: 'สมหญิง (demo)', passwordHash: await argon2.hash('demo1234', { type: argon2.argon2id }) },
  update: {},
});
const personaPath = new URL('../../../mock-data/persona.json', import.meta.url);
if (existsSync(personaPath)) {
  const p = JSON.parse(readFileSync(personaPath, 'utf8')) as { birthDate: string; nationalId: string };
  const key = envKey('PII_KEY');
  const data = { birthDateEnc: encryptStr(p.birthDate, key), nationalIdEnc: encryptStr(p.nationalId, key) };
  await prisma.pii.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
}
for (const purpose of ['planning', 'loan_summary']) {
  if (!(await prisma.consent.findFirst({ where: { userId: user.id, purpose } }))) {
    await prisma.consent.create({ data: { userId: user.id, purpose, granted: true, version: '2026-10-16' } });
  }
}
if (await needsReconsent(prisma, user.id)) await acceptConsents(prisma, user.id);
console.log(`seeded ${email}`);
await prisma.$disconnect();
