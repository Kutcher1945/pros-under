// Builds docs/Опека_документация.docx from USER_GUIDE.md + E2E_REPORT.md (Markdown stays the source).
// Run: yarn docs:docx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, LevelFormat, Packer, PageBreak, PageNumber,
  Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx';

const DOCS = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || path.join(DOCS, 'Опека_документация.docx');
const FONT = 'Arial';
const MONO = 'Consolas';
const CONTENT_W = 9638; // A4 (11906) minus 2 × 1134 (2 cm margins)
const BLUE = '1F4E79';
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };

// ── inline markdown: **bold**, `code`, [text](link) ─────────────────
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m;
  const push = (t, extra = {}) => t && out.push(new TextRun({ text: t, font: FONT, ...base, ...extra }));
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) push(tok.slice(2, -2), { bold: true });
    else if (tok.startsWith('`')) push(tok.slice(1, -1), { font: MONO, size: (base.size || 22) - 2, color: '1F3864' });
    else out.push(...runs(tok.replace(/^\[([^\]]+)\].*$/, '$1'), base)); // link text may hold `code`
    last = m.index + tok.length;
  }
  push(text.slice(last));
  return out;
}

function table(lines) {
  const rows = lines
    .filter((l) => !/^\|\s*-{2,}/.test(l.replace(/:/g, '')))
    .map((l) => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|')));
  const cols = rows[0].length;
  const weight = Array.from({ length: cols }, (_, i) => Math.max(...rows.map((r) => (r[i] || '').length), 3));
  const total = weight.reduce((a, b) => a + b, 0);
  let widths = weight.map((w) => Math.max(900, Math.round((w / total) * CONTENT_W)));
  const scale = CONTENT_W / widths.reduce((a, b) => a + b, 0);
  widths = widths.map((w) => Math.floor(w * scale));
  widths[widths.length - 1] += CONTENT_W - widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((r, ri) => new TableRow({
      tableHeader: ri === 0,
      cantSplit: true,
      children: widths.map((w, ci) => new TableCell({
        width: { size: w, type: WidthType.DXA },
        borders: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
        shading: ri === 0 ? { type: ShadingType.CLEAR, fill: 'DCE6F2', color: 'auto' } : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ children: runs(r[ci] || '', { size: 19, bold: ri === 0 }) })],
      })),
    })),
  });
}

function codeBlock(lines) {
  return lines.map((l, i) => new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: 'F2F2F2', color: 'auto' },
    spacing: { before: i === 0 ? 120 : 0, after: i === lines.length - 1 ? 160 : 0, line: 260 },
    indent: { left: 200, right: 200 },
    children: [new TextRun({ text: l || ' ', font: MONO, size: 17 })],
  }));
}

/** Markdown → docx blocks. `skipTitle` drops the file's own «# …» line. */
function convert(md, { skipTitle, listRef }) {
  const blocks = [];
  const lines = md.replace(/\r/g, '').split('\n');
  let para = [];
  let listInstance = 0;
  const flush = () => {
    if (para.length) blocks.push(new Paragraph({ spacing: { after: 120 }, children: runs(para.join(' ')) }));
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      flush();
      const code = [];
      while (++i < lines.length && !lines[i].startsWith('```')) code.push(lines[i]);
      blocks.push(...codeBlock(code));
      continue;
    }
    if (line.trim().startsWith('|')) {
      flush();
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++]);
      i--;
      blocks.push(table(rows), new Paragraph({ spacing: { after: 80 }, children: [] }));
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flush();
      if (h[1] === '#' && skipTitle) continue;
      const level = { '#': HeadingLevel.HEADING_1, '##': HeadingLevel.HEADING_2, '###': HeadingLevel.HEADING_3 }[h[1]];
      blocks.push(new Paragraph({ heading: level, children: runs(h[2]) }));
      continue;
    }
    const bullet = line.match(/^(\s*)-\s+(.*)$/);
    const numbered = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (bullet || numbered) {
      flush();
      const m = bullet || numbered;
      if (numbered && !/^\s*\d+\.\s/.test(lines[i - 1] || '')) listInstance++;
      blocks.push(new Paragraph({
        numbering: bullet ? { reference: 'bullets', level: m[1].length >= 2 ? 1 : 0 } : { reference: listRef, level: 0, instance: listInstance },
        spacing: { after: 60 },
        children: runs(m[2]),
      }));
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    // «**Поле:** значение» lines are a field list: one paragraph each.
    if (/^\*\*[^*]+:\*\*/.test(line.trim())) flush();
    para.push(line.trim());
  }
  flush();
  return blocks;
}

const guide = fs.readFileSync(path.join(DOCS, 'USER_GUIDE.md'), 'utf8');
const report = fs.readFileSync(path.join(DOCS, 'E2E_REPORT.md'), 'utf8');

const heading = (size, before, after, color) => ({
  run: { font: FONT, size, bold: true, color },
  paragraph: { spacing: { before, after }, keepNext: true, keepLines: true },
});

const doc = new Document({
  creator: 'Опека',
  title: 'Опека — руководство пользователя и отчёт о проверке',
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { font: FONT, size: 52, bold: true, color: BLUE }, paragraph: { spacing: { before: 0, after: 200 }, keepNext: true } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...heading(34, 360, 160, BLUE), paragraph: { spacing: { before: 360, after: 160 }, keepNext: true, keepLines: true, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...heading(28, 300, 120, BLUE), paragraph: { spacing: { before: 300, after: 120 }, keepNext: true, keepLines: true, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...heading(24, 240, 100, '2E74B5'), paragraph: { spacing: { before: 240, after: 100 }, keepNext: true, keepLines: true, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 270 } } } },
        ],
      },
      { reference: 'num-guide', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
      { reference: 'num-report', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '«Опека» — реестр и надзор · стр. ', font: FONT, size: 16, color: '808080' }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: '808080' })],
        })],
      }),
    },
    children: [
      new Paragraph({ spacing: { before: 2400 }, children: [] }),
      new Paragraph({ style: 'Title', children: [new TextRun({ text: '«Опека» — реестр и надзор', font: FONT })] }),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'Единый реестр дел несовершеннолетних города Алматы', font: FONT, size: 28, color: '404040' })] }),
      new Paragraph({
        spacing: { after: 600 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 6 } },
        children: [new TextRun({ text: 'Руководство пользователя и отчёт о сквозной проверке', font: FONT, size: 24, color: '404040' })],
      }),
      new Paragraph({ children: [new TextRun({ text: 'Часть 1. Руководство пользователя — вход, роли, действия каждой роли, полный цикл дела.', font: FONT, size: 22 })] }),
      new Paragraph({ children: [new TextRun({ text: 'Часть 2. Отчёт о проверке — 46 шагов под всеми учётными записями, результаты, очистка.', font: FONT, size: 22 })] }),
      new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: 'Дата: 04.11.2026', font: FONT, size: 20, color: '606060' })] }),
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'Часть 1. Руководство пользователя', font: FONT })] }),
      ...convert(guide, { skipTitle: true, listRef: 'num-guide' }),
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'Часть 2. Отчёт о сквозной проверке', font: FONT })] }),
      ...convert(report, { skipTitle: true, listRef: 'num-report' }),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log(`written ${OUT} (${buf.length} bytes)`);
});
