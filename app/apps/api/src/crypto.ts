import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';

export function envKey(name: 'PII_KEY' | 'FILE_KEY' | 'IP_HMAC_KEY'): Buffer {
  const k = Buffer.from(process.env[name] ?? '', 'base64');
  if (k.length !== 32) throw new Error(`${name} must be 32 bytes base64`);
  return k;
}

/** AES-256-GCM. Output = iv(12) | tag(16) | ciphertext. */
export function encrypt(plain: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), data]);
}

export function decrypt(blob: Buffer, key: Buffer): Buffer {
  const d = createDecipheriv('aes-256-gcm', key, blob.subarray(0, 12));
  d.setAuthTag(blob.subarray(12, 28));
  return Buffer.concat([d.update(blob.subarray(28)), d.final()]);
}

export const encryptStr = (s: string, key: Buffer) => encrypt(Buffer.from(s, 'utf8'), key).toString('base64');
export const decryptStr = (s: string, key: Buffer) => decrypt(Buffer.from(s, 'base64'), key).toString('utf8');

export const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
export const hmacIp = (ip: string, key: Buffer) => createHmac('sha256', key).update(ip).digest('hex');

/** JSON with sorted keys, so the hash survives jsonb key reordering. */
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(',')}}`;
}

export interface AuditRow {
  userId: string | null;
  actor: string;
  action: string;
  target: string | null;
  before: unknown;
  after: unknown;
  ipHmac: string | null;
  userAgent: string | null;
  at: string; // ISO
}

export const GENESIS = '0'.repeat(64);
export const auditHash = (prevHash: string, row: AuditRow) => sha256(prevHash + canonicalJson(row));

/** Returns index of the first broken entry, or -1 if the chain is intact. */
export function verifyChain(entries: (AuditRow & { prevHash: string; hash: string })[]): number {
  let prev = GENESIS;
  for (let i = 0; i < entries.length; i++) {
    const { prevHash, hash, ...row } = entries[i];
    if (prevHash !== prev || auditHash(prev, row) !== hash) return i;
    prev = hash;
  }
  return -1;
}
