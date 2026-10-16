import geoip from 'geoip-lite';
import type { PrismaService } from './prisma.service.js';

export const TERMS_VERSION = '2026-10-16';
export const PRIVACY_VERSION = '2026-10-16';
/** Contract basis: can't be withdrawn, only ended by deleting the account. */
export const REQUIRED_PURPOSES = ['terms', 'privacy', 'planning'];

/** "Windows · Chrome" from a user agent. */
export function deviceOf(ua = ''): string {
  const os = /iPad/.test(ua) ? 'iPad' : /iPhone/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  const br = /Line\//.test(ua) ? 'LINE' : /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /Firefox\//.test(ua) ? 'Firefox' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari'
    : /curl|node|undici/i.test(ua) ? 'โปรแกรม' : '';
  return [os, br].filter(Boolean).join(' · ') || 'อุปกรณ์ไม่ทราบชนิด';
}

const PRIVATE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|f[cd]|fe80:|localhost)/i;
/** Approximate city/country from an offline GeoIP DB. */
export function locationOf(ip?: string): string {
  if (!ip) return 'ไม่ทราบตำแหน่ง';
  const v4 = ip.replace(/^::ffff:/, '');
  if (PRIVATE.test(v4)) return 'เครือข่ายภายใน';
  const g = geoip.lookup(v4);
  return g ? [g.city, g.country].filter(Boolean).join(', ') : 'ไม่ทราบตำแหน่ง';
}

/** True when the latest accepted terms/privacy version is older than current (or missing). */
export async function needsReconsent(prisma: PrismaService, userId: string): Promise<boolean> {
  const rows = await prisma.consent.findMany({
    where: { userId, purpose: { in: ['terms', 'privacy'] }, granted: true }, orderBy: { at: 'desc' }, distinct: ['purpose'],
  });
  const v = Object.fromEntries(rows.map((r) => [r.purpose, r.version]));
  return !((v.terms ?? '') >= TERMS_VERSION && (v.privacy ?? '') >= PRIVACY_VERSION);
}

export const acceptConsents = (prisma: PrismaService, userId: string) =>
  prisma.consent.createMany({
    data: [
      { userId, purpose: 'terms', granted: true, version: TERMS_VERSION },
      { userId, purpose: 'privacy', granted: true, version: PRIVACY_VERSION },
      { userId, purpose: 'planning', granted: true, version: TERMS_VERSION },
    ],
  });
