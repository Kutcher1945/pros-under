import { describe, expect, it } from 'vitest';

import { ageOn, formatDate, offsetDay } from '@/lib/dates';
import { casesCsv, csvCell } from '@/lib/export';
import { canPreview, uploadError } from '@/lib/files';

import { FROM, fresh } from './fixtures';

describe('dates', () => {
  it('computes full years, respecting the birthday', () => {
    expect(ageOn('2010-11-05', '2026-11-04')).toBe(15);
    expect(ageOn('2010-11-04', '2026-11-04')).toBe(16);
    expect(ageOn('2027-01-01', '2026-11-04')).toBe(-1);
  });

  it('formats dates and timestamps in Russian style', () => {
    expect(formatDate('2026-11-04')).toBe('04.11.2026');
    expect(formatDate('')).toBe('—');
    expect(formatDate('not a date')).toBe('—');
    expect(formatDate('2026-11-04T06:30:00Z', true)).toMatch(/^04\.11\.2026, \d{2}:\d{2}$/);
  });

  it('shifts days in Almaty time', () => {
    expect(offsetDay(1, FROM)).toBe('2026-11-05');
    expect(offsetDay(-4, FROM)).toBe('2026-10-31');
  });
});

describe('csv export', () => {
  it('neutralises formula prefixes and escapes quotes', () => {
    expect(csvCell('=SUM(A1)')).toBe(`"'=SUM(A1)"`);
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(3)).toBe('"3"');
    expect(csvCell('\t=HYPERLINK("x")')).toBe(`"'\t=HYPERLINK(""x"")"`);
    expect(csvCell('\r=1')).toBe(`"'\r=1"`);
  });

  it('writes a BOM, header and one row per case', () => {
    const state = fresh();
    const csv = casesCsv(state, state.cases.slice(0, 2));
    expect(csv.startsWith('﻿"Номер дела"')).toBe(true);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[2]).toContain('"Ким Арина"');
    expect(lines[2]).toContain('"Алия Садыкова"');
  });
});

describe('uploads', () => {
  it('accepts small office documents and images only', () => {
    expect(uploadError({ name: 'a.pdf', size: 10 })).toBeNull();
    expect(uploadError(null)).toBe('Выберите файл.');
    expect(uploadError({ name: 'a.pdf', size: 11 * 1024 * 1024 })).toBe('Файл должен быть не больше 10 МБ.');
    expect(uploadError({ name: 'a.exe', size: 10 })).toBe('Допустимы PDF, DOCX, XLSX, JPG и PNG.');
  });

  it('previews only types the browser renders inertly', () => {
    const doc = { id: '1', type: 't', name: 'x', date: '', by: '', at: '' };
    expect(canPreview({ ...doc, contentType: 'application/pdf' })).toBe(true);
    expect(canPreview({ ...doc, contentType: 'image/jpeg' })).toBe(true);
    expect(canPreview({ ...doc, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })).toBe(false);
    expect(canPreview(doc)).toBe(false);
  });
});
