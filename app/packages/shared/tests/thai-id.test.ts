import { describe, expect, it } from 'vitest';
import { isThaiNationalId, normalizeThaiPhone } from '../src';

describe('isThaiNationalId', () => {
  it('valid checksum', () => {
    expect(isThaiNationalId('1101700230708')).toBe(true);
    expect(isThaiNationalId('1103700123458')).toBe(true); // demo persona
    expect(isThaiNationalId('1-1017-00230-70-8')).toBe(true);
  });
  it('rejects bad checksum / length / letters', () => {
    expect(isThaiNationalId('1101700230705')).toBe(false);
    expect(isThaiNationalId('110170023070')).toBe(false);
    expect(isThaiNationalId('11017002307a5')).toBe(false);
    expect(isThaiNationalId('')).toBe(false);
  });
});

describe('normalizeThaiPhone', () => {
  it('normalises', () => {
    expect(normalizeThaiPhone('081-234-5678')).toBe('0812345678');
    expect(normalizeThaiPhone('+66 91 234 5678')).toBe('0912345678');
    expect(normalizeThaiPhone('66612345678')).toBe('0612345678');
  });
  it('rejects non-mobile', () => {
    expect(normalizeThaiPhone('021234567')).toBeNull();
    expect(normalizeThaiPhone('0712345678')).toBeNull();
    expect(normalizeThaiPhone('08123456789')).toBeNull();
  });
});
