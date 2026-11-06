/* Helpers for the full-cycle browser test (e2e/full-cycle.mjs). */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

export const PDF = { name: 'ТЕСТ документ.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% e2e test file\n%%EOF\n') };

export function isoDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Almaty' });
}

/** Step log: every action is recorded with its account and outcome for the report. */
export class Report {
  constructor() {
    this.rows = [];
  }

  skip(account, action, reason) {
    this.rows.push({ account, action, ok: true, skipped: reason });
    console.log(`  – ${account.padEnd(22)} ${action} (пропущено: ${reason})`);
  }

  async step(account, action, fn) {
    const started = Date.now();
    try {
      await fn();
      this.rows.push({ account, action, ok: true, ms: Date.now() - started });
      console.log(`  ✓ ${account.padEnd(22)} ${action}`);
    } catch (err) {
      this.rows.push({ account, action, ok: false, error: String(err.message || err).split('\n')[0] });
      console.log(`  ✗ ${account.padEnd(22)} ${action}\n      ${String(err.message || err).split('\n')[0]}`);
      throw err;
    }
  }
}

export class App {
  constructor(browser, base, shotsDir) {
    this.browser = browser;
    this.base = base;
    this.shotsDir = shotsDir;
    this.errors = [];
    mkdirSync(shotsDir, { recursive: true });
  }

  /** Signs in as `login`, runs `fn(page)`, signs out. */
  async as(login, password, fn) {
    const context = await this.browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const page = await context.newPage();
    page.on('pageerror', (e) => this.errors.push(`${login}: ${e.message}`));
    await page.goto(`${this.base}/login`, { timeout: 120000 });
    await page.getByLabel('Имя пользователя').fill(login);
    await page.getByLabel('Пароль', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await page.waitForURL((u) => u.pathname !== '/login', { timeout: 60000 });
    // Signed-in shell rendered (no networkidle: `next dev` keeps an HMR connection open).
    await page.getByRole('button', { name: 'Выйти' }).waitFor({ timeout: 60000 });
    try {
      await fn(page);
    } finally {
      await page.getByRole('button', { name: 'Выйти' }).click().catch(() => {});
      await context.close();
    }
  }

  async shot(page, name) {
    await page.screenshot({ path: `${this.shotsDir}/${name}.png`, fullPage: true });
  }
}

export const dialog = (page) => page.getByRole('dialog');

export async function submitDialog(page, button) {
  await dialog(page).getByRole('button', { name: button, exact: true }).click();
  await dialog(page).waitFor({ state: 'detached', timeout: 30000 });
}

export async function dialogError(page, button, message) {
  await dialog(page).getByRole('button', { name: button, exact: true }).click();
  await dialog(page).getByRole('alert').filter({ hasText: message }).waitFor({ timeout: 30000 });
}

export async function toast(page, text) {
  await page.getByRole('status').filter({ hasText: text }).first().waitFor({ timeout: 30000 });
}

export async function navLabels(page) {
  const links = await page.getByRole('navigation', { name: 'Разделы' }).getByRole('link').allTextContents();
  return links.map((t) => t.trim().replace(/\d+$/, ''));
}

export async function openCase(page, base, caseId, tab) {
  await page.goto(`${base}/registry/${caseId}${tab ? `?tab=${tab}` : ''}`);
  await page.getByRole('link', { name: 'Вернуться в реестр' }).waitFor();
}

/** The comment/signal card whose text contains `text`. */
export function remarkCard(page, text) {
  return page.locator('article').filter({ hasText: text });
}

export async function raiseSignal(page, { text, section, executor }) {
  await page.getByRole('button', { name: 'Комментарий', exact: true }).click();
  await dialog(page).getByLabel('Требует исправления').check();
  await dialog(page).getByLabel(/^Комментарий/).fill(text);
  await dialog(page).getByLabel(/Раздел карточки/).selectOption(section);
  await dialog(page).getByLabel(/Исполнитель/).selectOption({ label: executor });
  await submitDialog(page, 'Сохранить');
  await toast(page, 'Замечание направлено исполнителю');
}

export async function respond(page, signalText, action, note) {
  const card = remarkCard(page, signalText);
  const [button, label, submit] = {
    reply: ['Отправить на проверку', /Что исправлено/, 'Отправить на проверку'],
    return: ['Вернуть на доработку', /Причина/, 'Вернуть'],
    cancel: ['Отменить замечание', /Причина/, 'Отменить замечание'],
  }[action];
  await card.getByRole('button', { name: button }).click();
  await dialog(page).getByLabel(label).fill(note);
  await submitDialog(page, submit);
}

export async function signalStatus(page, signalText, status) {
  await remarkCard(page, signalText).getByText(status, { exact: true }).waitFor({ timeout: 30000 });
}

export async function apiStatus(base, login, password, path) {
  const res = await fetch(`${base}/api/v1/auth/login/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: login, password }) });
  const { tokens } = await res.json();
  const status = (await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${tokens.access}` } })).status;
  await fetch(`${base}/api/v1/auth/logout/`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.access}` }, body: JSON.stringify({ refresh: tokens.refresh }) });
  return status;
}

export { assert };
