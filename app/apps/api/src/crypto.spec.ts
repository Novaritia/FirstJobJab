import { randomBytes } from 'node:crypto';
import { auditHash, decrypt, decryptStr, encrypt, encryptStr, GENESIS, verifyChain, type AuditRow } from './crypto.js';

const key = randomBytes(32);

describe('crypto', () => {
  it('roundtrips AES-GCM', () => {
    const buf = randomBytes(1000);
    expect(decrypt(encrypt(buf, key), key).equals(buf)).toBe(true);
    expect(decryptStr(encryptStr('1-2345-67890-12-3', key), key)).toBe('1-2345-67890-12-3');
  });

  it('rejects tampered ciphertext and wrong key', () => {
    const blob = encrypt(Buffer.from('secret'), key);
    blob[blob.length - 1] ^= 1;
    expect(() => decrypt(blob, key)).toThrow();
    expect(() => decrypt(encrypt(Buffer.from('x'), key), randomBytes(32))).toThrow();
  });

  it('verifies the audit hash chain and detects tampering', () => {
    const rows: AuditRow[] = [1, 2, 3].map((i) => ({
      userId: 'u1', actor: 'user', action: `a${i}`, target: null, before: null,
      after: { b: i, a: [1, { z: 1, y: 2 }] }, ipHmac: null, userAgent: null, at: new Date(i).toISOString(),
    }));
    let prev = GENESIS;
    const chain = rows.map((r) => {
      const hash = auditHash(prev, r);
      const e = { ...r, prevHash: prev, hash };
      prev = hash;
      return e;
    });
    expect(verifyChain(chain)).toBe(-1);
    // key order (jsonb) must not matter
    chain[1].after = { a: [1, { y: 2, z: 1 }], b: 2 };
    expect(verifyChain(chain)).toBe(-1);
    chain[1].action = 'tampered';
    expect(verifyChain(chain)).toBe(1);
  });
});
