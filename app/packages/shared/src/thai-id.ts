/** Thai national ID: 13 digits, last = (11 - Σ dᵢ·(13-i) mod 11) mod 10. Accepts dashes/spaces. */
export function isThaiNationalId(s: string): boolean {
  const id = s.replace(/[\s-]/g, '');
  if (!/^\d{13}$/.test(id)) return false;
  const sum = [...id.slice(0, 12)].reduce((t, d, i) => t + Number(d) * (13 - i), 0);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
}

/** Thai mobile → '0812345678' (also accepts +66 / 66 prefix, dashes, spaces). null if not 06/08/09 + 8 digits. */
export function normalizeThaiPhone(s: string): string | null {
  let d = s.replace(/[\s\-().]/g, '');
  if (d.startsWith('+66')) d = '0' + d.slice(3);
  else if (/^66\d{9}$/.test(d)) d = '0' + d.slice(2);
  return /^0[689]\d{8}$/.test(d) ? d : null;
}
