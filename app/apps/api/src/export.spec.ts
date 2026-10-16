import { buildCsv, CSV_HEAD, csvCell, formatNationalId, statementPdf, thDate, totals, type ExportRow } from './export.js';
import { Range } from './export.controller.js';

const row = (o: Partial<ExportRow>): ExportRow => ({
  date: '2026-04-01', time: '09:00', bank: 'KBANK', accountNoMasked: 'xxx-x-x4821-x', description: 'x', category: 'food',
  direction: 'out', amount: 10000, balance: null, source: 'statement', channel: null, note: null, verified: true, ...o,
});
const rows = [
  row({ direction: 'in', category: 'salary', amount: 2725000, balance: 3000000, description: 'เงินเดือน' }),
  row({ amount: 12345, description: '=HYPERLINK("x")', note: 'มื้อเที่ยง, ร้านป้า' }),
  row({ amount: 750000, category: 'rent', source: 'slip', bank: 'CASH', accountNoMasked: 'cash', time: null }),
];

describe('buildCsv', () => {
  const csv = buildCsv(rows);
  const lines = csv.slice(1).split('\r\n').filter(Boolean);
  const cells = (l: string) => [...(l + ',').matchAll(/("(?:[^"]|"")*"|[^,]*),/g)].map((m) => m[1]);

  it('starts with a UTF-8 BOM, CRLF, Thai header', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).not.toMatch(/[^\r]\n/);
    expect(lines[0]).toBe(CSV_HEAD.join(','));
    expect(lines).toHaveLength(4);
  });

  it('splits income/expense into separate plain-number columns and stays rectangular', () => {
    const [inc, food, rent] = lines.slice(1).map(cells);
    for (const c of [inc, food, rent]) expect(c).toHaveLength(CSV_HEAD.length);
    expect(inc.slice(5, 9)).toEqual(['รายรับ', '27250.00', '', '30000.00']);
    expect(food.slice(5, 8)).toEqual(['รายจ่าย', '', '123.45']);
    expect(rent[2]).toBe('เงินสด');
    expect(rent[9]).toBe('สลิปโอนเงิน');
    expect(inc[2]).toBe('กสิกรไทย xxx-x-x4821-x');
    expect(food[3]).toBe(`"'=HYPERLINK(""x"")"`); // formula injection neutralised
    expect(food[10]).toBe('"มื้อเที่ยง, ร้านป้า"');
    const sum = (i: number) => lines.slice(1).map(cells).reduce((s, c) => s + Number(c[i] || 0), 0);
    expect(sum(6)).toBeCloseTo(27250);
    expect(sum(7)).toBeCloseTo(123.45 + 7500);
  });

  it('totals match the columns', () => {
    expect(totals(rows)).toMatchObject({ income: 2725000, expense: 762345, net: 2725000 - 762345 });
    expect(totals(rows).byCategory[0]).toEqual(['rent', 750000]);
  });

  it('helpers', () => {
    expect(csvCell('-12.50')).toBe('-12.50');
    expect(thDate('2026-04-01')).toBe('01/04/2569');
    expect(formatNationalId('1103700123458')).toBe('1-1037-00123-45-8');
  });
});

describe('Range', () => {
  it('validates order and max 3 years', () => {
    expect(Range.safeParse({ from: '2026-04-01', to: '2026-09-30' }).data).toMatchObject({ includeHidden: false, includeTransfers: false });
    expect(Range.safeParse({ from: '2026-09-30', to: '2026-04-01' }).success).toBe(false);
    expect(Range.safeParse({ from: '2020-01-01', to: '2026-01-01' }).success).toBe(false);
    expect(Range.safeParse({ from: '2026-04-01', to: '2026-09-30', includeHidden: '1' }).data?.includeHidden).toBe(true);
  });
});

describe('statementPdf', () => {
  it('renders a multi-page PDF', async () => {
    const many = Array.from({ length: 120 }, (_, i) => row({ amount: 100 * (i + 1), description: `รายการทดสอบภาษาไทย ${i}` }));
    const pdf = await statementPdf(many, { holder: 'สมหญิง ใจดี', from: '2026-04-01', to: '2026-09-30', generatedAt: 'now', accounts: ['กสิกรไทย'], exportNo: 1 });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect((pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1);
  });
});
