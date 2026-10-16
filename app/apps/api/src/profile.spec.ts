import { BadRequestException } from '@nestjs/common';
import { maskNationalId, parseProfile } from './profile.service.js';
import { paging } from './validation.js';

const fieldsOf = (body: unknown) => {
  try { parseProfile(body); return null; } catch (e) { return ((e as BadRequestException).getResponse() as { fields: Record<string, string> }).fields; }
};

describe('parseProfile', () => {
  it('normalises phone + ID, salary baht → satang, "" clears', () => {
    expect(parseProfile({ phone: '081-234-5678', nationalId: '1-1037-00123-45-8', monthlySalary: 25000.5, fullName: '' }))
      .toEqual({ phone: '0812345678', nationalId: '1103700123458', monthlySalary: 2500050, fullName: null });
  });
  it('returns per-field codes', () => {
    expect(fieldsOf({ phone: '021234567', nationalId: '1103700123457', displayName: ' ', birthDate: '2999-01-01', monthlySalary: -1 }))
      .toEqual({ phone: 'invalid_phone', nationalId: 'invalid_national_id', displayName: 'required', birthDate: 'invalid_date', monthlySalary: 'invalid_salary' });
    expect(fieldsOf({ email: 'x@y.z' })).toBeTruthy(); // email is read-only
  });
  it('masks the ID, last 3 digits visible', () => {
    expect(maskNationalId('1103700123458')).toBe('x-xxxx-xxxxx-45-8');
  });
});

describe('paging', () => {
  it('defaults and page math', () => {
    expect(paging({}, 100)).toEqual({ take: 100, skip: 0 });
    expect(paging({ limit: '10', page: '3' }, 100)).toEqual({ take: 10, skip: 20 });
    expect(() => paging({ limit: '500' }, 100, 100)).toThrow();
  });
});
