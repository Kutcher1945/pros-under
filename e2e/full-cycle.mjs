/* Full-cycle browser test of Опека: every account, every action, start to finish.

   Runs against a live frontend + backend (creates real records — use a test DB,
   or clean up afterwards: test cases are named «ТЕСТ Е2Е …»).

     E2E_ACCOUNTS='{"admin":"…","opeka.insp.almaly1":"…",…}' \
     [E2E_BASE=http://localhost:3000] [E2E_API=http://localhost:8000] [E2E_CHROME=/path/to/chrome] [E2E_SKIP_DTP=1] \
     node e2e/full-cycle.mjs
*/
import { writeFileSync } from 'node:fs';

import { chromium } from 'playwright';

import { apiStatus, App, assert, dialog, dialogError, isoDay, navLabels, openCase, PDF, raiseSignal, remarkCard, Report, respond, signalStatus, submitDialog, toast } from './lib.mjs';

const BASE = process.env.E2E_BASE ?? 'http://localhost:3000';
const API = process.env.E2E_API ?? 'http://localhost:8000';
const PW = JSON.parse(process.env.E2E_ACCOUNTS ?? '{}');
const RUN = Date.now().toString(36).slice(-5).toUpperCase();

const INSP1 = 'opeka.insp.almaly1';
const INSP2 = 'opeka.insp.almaly2';
const INSP_B = 'opeka.insp.bostandyk';
const CHIEF = 'opeka.chief.almaly';
const CHIEF_B = 'opeka.chief.bostandyk';
const PROSECUTOR = 'opeka.prosecutor';
const ADMIN = 'opeka.admin';
const SUPER = 'admin';
const NAMES = {
  [INSP1]: 'Инспектор Алмалинского ОВД 1 (тест)',
  [INSP2]: 'Инспектор Алмалинского ОВД 2 (тест)',
  [INSP_B]: 'Инспектор Бостандыкского ОВД (тест)',
  [CHIEF]: 'Руководитель Алмалинского ОВД (тест)',
};

const CHILD = `ТЕСТ Е2Е Иванов ${RUN}`;
const CHILD_SUPER = `ТЕСТ Е2Е Петрова ${RUN}`;
const SIG_CHIEF = `Приложите индивидуальный план ${RUN}`;
const SIG_PROS = `Проверьте комплектность ${RUN}`;
const SIG_CANCEL = `Уточните адрес ${RUN}`;

async function fillNewCase(page, name, { iin = '' } = {}) {
  const d = dialog(page);
  await d.getByLabel('ФИО *', { exact: true }).fill(name);
  await d.getByLabel(/Дата рождения/).fill('2012-05-01');
  await d.getByLabel(/ИИН/).fill(iin);
  await d.getByLabel(/Фактический адрес/).fill('г. Алматы, ул. Тестовая, 1');
  await d.getByLabel(/Организация образования/).fill('Школа №1');
  await d.getByLabel(/Официальная дата постановки/).fill(isoDay(-3));
  await d.getByLabel(/Вид документа основания/).fill('Решение');
  await d.getByLabel(/Дата документа основания/).fill(isoDay(-4));
  await d.getByLabel(/Документ основания/).setInputFiles(PDF);
}

const caseIdFromUrl = (page) => new URL(page.url()).pathname.split('/').pop();

async function main() {
  const browser = await chromium.launch(process.env.E2E_CHROME ? { executablePath: process.env.E2E_CHROME } : {});
  const app = new App(browser, BASE, new URL('./screenshots', import.meta.url).pathname);
  const r = new Report();
  let caseId;
  let superCaseId;

  console.log(`Опека full cycle · run ${RUN} · ${BASE} → ${API}\n`);

  // ── Inspector: create and fill the card ───────────────────────────
  await app.as(INSP1, PW[INSP1], async (page) => {
    await r.step(INSP1, 'вход → «Реестр дел»; меню: Реестр, Сигналы', async () => {
      await page.waitForURL('**/registry');
      assert.deepEqual(await navLabels(page), ['Реестр дел', 'Сигналы надзора']);
    });
    await r.step(INSP1, 'нет доступа к «Задачам и срокам» (редирект)', async () => {
      await page.goto(`${BASE}/tasks`);
      await page.waitForURL('**/registry');
    });
    await r.step(INSP1, 'создание карточки: ошибка ИИН → исправление → создана', async () => {
      await page.getByRole('button', { name: 'Создать карточку' }).click();
      await fillNewCase(page, CHILD, { iin: '123' });
      await dialogError(page, 'Создать карточку', 'ИИН должен содержать 12 цифр.');
      await dialog(page).getByLabel(/ИИН/).fill('');
      await submitDialog(page, 'Создать карточку');
      await page.getByRole('heading', { name: CHILD }).waitFor();
      caseId = caseIdFromUrl(page);
      await page.getByText('Не проверена', { exact: true }).waitFor();
      await app.shot(page, '01-inspector-case-created');
    });
    await r.step(INSP1, 'редактирование карточки (контакт представителя)', async () => {
      await page.getByRole('button', { name: 'Редактировать' }).click();
      await dialog(page).getByLabel(/Контакт представителя/).fill('+7 700 000 00 00');
      await submitDialog(page, 'Сохранить изменения');
      await toast(page, 'Изменения сохранены');
      await page.getByText('+7 700 000 00 00').waitFor();
    });
    await r.step(INSP1, 'дополнительное основание с документом', async () => {
      await page.getByRole('button', { name: 'Добавить основание' }).click();
      await dialog(page).getByLabel(/^Вид документа/).fill('Защитное предписание');
      await dialog(page).getByLabel(/Документ основания/).setInputFiles(PDF);
      await submitDialog(page, 'Добавить основание');
      await toast(page, 'Основание добавлено');
    });
    await r.step(INSP1, 'добавление документа «Индивидуальный план»', async () => {
      await openCase(page, BASE, caseId, 'docs');
      await page.getByRole('button', { name: 'Добавить документ' }).click();
      await dialog(page).getByLabel(/Файл/).setInputFiles(PDF);
      await submitDialog(page, 'Добавить');
      await toast(page, 'Документ добавлен');
      await page.getByText('Индивидуальный план ·', { exact: false }).waitFor();
    });
    await r.step(INSP1, 'скачивание документа с сервера', async () => {
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Скачать' }).first().click();
      assert.equal((await download).suggestedFilename(), PDF.name);
    });
  });

  // ── Chief: review, signal, reassign ───────────────────────────────
  await app.as(CHIEF, PW[CHIEF], async (page) => {
    await r.step(CHIEF, 'вход → «Обзор»; меню: Обзор, Реестр, Сигналы, Задачи', async () => {
      await page.waitForURL('**/overview');
      assert.deepEqual(await navLabels(page), ['Обзор', 'Реестр дел', 'Сигналы надзора', 'Задачи и сроки']);
    });
    await r.step(CHIEF, 'реестр: дело видно, фильтр «Требуют проверки»', async () => {
      await page.goto(`${BASE}/registry?filter=unchecked`);
      await page.getByRole('link', { name: CHILD }).waitFor();
    });
    await r.step(CHIEF, 'отметка «Проверено»', async () => {
      await openCase(page, BASE, caseId);
      await page.getByRole('button', { name: 'Проверено' }).click();
      await toast(page, 'Карточка отмечена проверенной');
      await page.getByText('Проверена', { exact: true }).waitFor();
    });
    await r.step(CHIEF, 'замечание инспектору со сроком', async () => {
      await raiseSignal(page, { text: SIG_CHIEF, section: 'Документы', executor: `${NAMES[INSP1]} · Инспектор` });
      await signalStatus(page, SIG_CHIEF, 'Открыто');
    });
    await r.step(CHIEF, 'смена инспектора → второй инспектор → обратно', async () => {
      for (const target of [INSP2, INSP1]) {
        await page.getByRole('button', { name: 'Сменить инспектора' }).click();
        await dialog(page).getByLabel(/Ответственный инспектор/).selectOption({ label: NAMES[target] });
        await submitDialog(page, 'Назначить');
        await toast(page, 'Ответственный назначен');
      }
      await page.getByRole('button', { name: 'Основные сведения' }).click();
      await page.getByText(NAMES[INSP1], { exact: true }).waitFor();
    });
  });

  // ── Signal loop: reply → return → reply → accept ──────────────────
  await app.as(INSP1, PW[INSP1], async (page) => {
    await r.step(INSP1, '«Сигналы надзора»: замечание руководителя в списке', async () => {
      await page.goto(`${BASE}/signals`);
      await page.getByRole('row').filter({ hasText: SIG_CHIEF }).waitFor();
    });
    await r.step(INSP1, 'ответ «Отправить на проверку»', async () => {
      await openCase(page, BASE, caseId, 'comments');
      await respond(page, SIG_CHIEF, 'reply', 'План приложен во вкладке «Документы».');
      await signalStatus(page, SIG_CHIEF, 'На проверке');
    });
  });
  await app.as(CHIEF, PW[CHIEF], async (page) => {
    await r.step(CHIEF, '«Задачи и сроки»: вкладка «На проверке»', async () => {
      await page.goto(`${BASE}/tasks`);
      await page.getByRole('button', { name: /На проверке/ }).click();
      await page.getByRole('row').filter({ hasText: SIG_CHIEF }).waitFor();
    });
    await r.step(CHIEF, 'возврат на доработку с причиной', async () => {
      await openCase(page, BASE, caseId, 'comments');
      await respond(page, SIG_CHIEF, 'return', 'Нет подписи в плане.');
      await signalStatus(page, SIG_CHIEF, 'Открыто');
    });
  });
  await app.as(INSP1, PW[INSP1], async (page) => {
    await r.step(INSP1, 'повторный ответ после доработки', async () => {
      await openCase(page, BASE, caseId, 'comments');
      await respond(page, SIG_CHIEF, 'reply', 'Подписанный план приложен.');
    });
  });
  await app.as(CHIEF, PW[CHIEF], async (page) => {
    await r.step(CHIEF, 'принятие исправления → замечание закрыто', async () => {
      await openCase(page, BASE, caseId, 'comments');
      await remarkCard(page, SIG_CHIEF).getByRole('button', { name: 'Принять' }).click();
      await toast(page, 'Исправление принято');
      await signalStatus(page, SIG_CHIEF, 'Закрыто');
    });
  });

  // ── Prosecutor → chief → delegate → inspector → prosecutor ────────
  await app.as(PROSECUTOR, PW[PROSECUTOR], async (page) => {
    await r.step(PROSECUTOR, 'вход → «Общий обзор» по городу; меню: Обзор, Реестр', async () => {
      await page.waitForURL('**/overview');
      await page.getByRole('heading', { name: 'Общий обзор' }).waitFor();
      assert.deepEqual(await navLabels(page), ['Общий обзор', 'Реестр дел']);
    });
    await r.step(PROSECUTOR, 'замечание руководителю ОВД', async () => {
      await openCase(page, BASE, caseId);
      await raiseSignal(page, { text: SIG_PROS, section: 'Документы', executor: `${NAMES[CHIEF]} · Руководитель ОВД` });
    });
    await r.step(PROSECUTOR, 'второе замечание → отмена автором', async () => {
      await raiseSignal(page, { text: SIG_CANCEL, section: 'Основные сведения', executor: `${NAMES[INSP1]} · Инспектор` });
      await respond(page, SIG_CANCEL, 'cancel', 'Направлено по ошибке.');
      await signalStatus(page, SIG_CANCEL, 'Закрыто');
    });
    await r.step(PROSECUTOR, 'простой комментарий без исправления', async () => {
      await page.getByRole('button', { name: 'Добавить комментарий' }).click();
      await dialog(page).getByLabel(/^Комментарий/).fill(`Комментарий прокурора ${RUN}`);
      await submitDialog(page, 'Сохранить');
      await toast(page, 'Комментарий добавлен');
    });
  });
  await app.as(CHIEF, PW[CHIEF], async (page) => {
    await r.step(CHIEF, '«Сигналы» → «Входящие от прокурора»', async () => {
      await page.goto(`${BASE}/signals`);
      await page.getByRole('row').filter({ hasText: SIG_PROS }).waitFor();
    });
    await r.step(CHIEF, 'передача замечания прокурора инспектору', async () => {
      await openCase(page, BASE, caseId, 'comments');
      await remarkCard(page, SIG_PROS).getByRole('button', { name: 'Передать инспектору' }).click();
      await dialog(page).getByLabel(/Инспектор/).selectOption({ label: NAMES[INSP1] });
      await submitDialog(page, 'Передать');
      await toast(page, 'Исполнитель изменён');
    });
  });
  await app.as(INSP1, PW[INSP1], async (page) => {
    await r.step(INSP1, 'ответ на переданное замечание прокурора', async () => {
      await openCase(page, BASE, caseId, 'comments');
      await respond(page, SIG_PROS, 'reply', 'Комплектность проверена.');
    });
  });
  await app.as(PROSECUTOR, PW[PROSECUTOR], async (page) => {
    await r.step(PROSECUTOR, 'реестр: фильтр «На моей проверке» → принятие', async () => {
      await page.goto(`${BASE}/registry?filter=myreview`);
      await page.getByRole('link', { name: CHILD }).click();
      await page.getByRole('button', { name: /Комментарии и замечания/ }).click();
      await remarkCard(page, SIG_PROS).getByRole('button', { name: 'Принять' }).click();
      await signalStatus(page, SIG_PROS, 'Закрыто');
    });
  });

  // ── Other ОВД cannot see the case ─────────────────────────────────
  for (const login of [CHIEF_B, INSP_B]) {
    await app.as(login, PW[login], async (page) => {
      await r.step(login, 'чужое ОВД: дела нет в реестре, по ссылке «недоступна»', async () => {
        await page.goto(`${BASE}/registry`);
        await page.getByText(/Показано \d+ из \d+ дел/).waitFor();
        assert.equal(await page.getByRole('link', { name: CHILD }).count(), 0);
        await page.goto(`${BASE}/registry/${caseId}`);
        await page.getByText('Карточка недоступна').waitFor();
      });
    });
  }

  // ── Опека administrator (before archiving: the block guard needs INSP1's active case) ──
  const tempLogin = `opeka.e2e.${RUN.toLowerCase()}`;
  await app.as(ADMIN, PW[ADMIN], async (page) => {
    await r.step(ADMIN, 'вход → «Пользователи»; меню: Пользователи, Справочники', async () => {
      await page.waitForURL('**/users');
      assert.deepEqual(await navLabels(page), ['Пользователи', 'Справочники']);
    });
    await r.step(ADMIN, 'нет доступа к делам (редирект из реестра)', async () => {
      await page.goto(`${BASE}/registry`);
      await page.waitForURL('**/users');
    });
    await r.step(ADMIN, 'создание пользователя: слабый пароль → ошибка → создан', async () => {
      await page.getByRole('button', { name: 'Добавить пользователя' }).click();
      await dialog(page).getByLabel(/^ФИО/).fill(`ТЕСТ Е2Е Инспектор ${RUN}`);
      await dialog(page).getByLabel(/Логин для входа/).fill(tempLogin);
      await dialog(page).getByLabel(/Начальный пароль/).fill('123');
      await dialogError(page, 'Создать профиль', 'Введённый пароль');
      await dialog(page).getByLabel(/Начальный пароль/).fill(`Tmp-${RUN}-Passw0rd!`);
      await submitDialog(page, 'Создать профиль');
      await toast(page, 'Профиль создан');
    });
    await r.step(ADMIN, 'блокировка инспектора с делами запрещена', async () => {
      const row = page.getByRole('row').filter({ hasText: NAMES[INSP1] });
      await row.getByRole('button', { name: 'Заблокировать' }).click();
      await toast(page, 'Сначала передайте активные дела другому инспектору.');
      await row.getByText('Активен', { exact: true }).waitFor();
    });
    await r.step(ADMIN, 'блокировка и разблокировка нового пользователя', async () => {
      const row = page.getByRole('row').filter({ hasText: tempLogin });
      await row.getByRole('button', { name: 'Заблокировать' }).click();
      await toast(page, 'Доступ заблокирован');
      await row.getByRole('button', { name: 'Активировать' }).click();
      await toast(page, 'Доступ активирован');
    });
    await r.step(ADMIN, 'справочник: дубль отклонён, новое значение добавлено', async () => {
      await page.getByRole('link', { name: 'Справочники' }).click();
      await page.getByRole('button', { name: 'Добавить' }).first().click();
      await dialog(page).getByLabel(/Подразделение ОВД/).fill('алмалинское овд');
      await dialogError(page, 'Добавить', 'Такое значение уже существует.');
      await dialog(page).getByLabel(/Подразделение ОВД/).fill(`ТЕСТ Е2Е ОВД ${RUN}`);
      await submitDialog(page, 'Добавить');
      await page.getByText(`ТЕСТ Е2Е ОВД ${RUN}`).waitFor();
    });
  });

  // ── Archive: request → return → request → approve ─────────────────
  const requestArchive = async (page, note) => {
    await openCase(page, BASE, caseId);
    await page.getByRole('button', { name: 'Запросить архивирование' }).click();
    await dialog(page).getByLabel(/Подтверждающий документ/).setInputFiles(PDF);
    await dialog(page).getByLabel(/Пояснение/).fill(note);
    await submitDialog(page, 'Отправить руководителю ОВД');
    await page.getByText('Архивирование на проверке ОВД').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Редактировать' }).count(), 0);
  };
  await app.as(INSP1, PW[INSP1], async (page) => {
    await r.step(INSP1, 'запрос архивирования (дело заблокировано для правки)', () => requestArchive(page, 'Основание прекращено решением органа.'));
  });
  await app.as(CHIEF, PW[CHIEF], async (page) => {
    await r.step(CHIEF, 'рассмотрение запроса → возврат с причиной', async () => {
      await openCase(page, BASE, caseId);
      await page.getByRole('button', { name: 'Рассмотреть запрос и документы' }).click();
      await dialog(page).getByText('Приложен к текущему запросу').waitFor();
      await dialog(page).getByRole('button', { name: 'Вернуть инспектору' }).click();
      await dialog(page).getByLabel(/Причина возврата/).fill('Нужна копия решения.');
      await submitDialog(page, 'Вернуть инспектору');
      await page.getByText('Запрос архивирования возвращён').waitFor();
    });
  });
  await app.as(INSP1, PW[INSP1], async (page) => {
    await r.step(INSP1, 'повторный запрос архивирования', () => requestArchive(page, 'Копия решения приложена.'));
  });
  await app.as(CHIEF, PW[CHIEF], async (page) => {
    await r.step(CHIEF, 'одобрение → дело в архиве', async () => {
      await openCase(page, BASE, caseId);
      await page.getByRole('button', { name: 'Рассмотреть запрос и документы' }).click();
      await submitDialog(page, 'Одобрить и архивировать');
      await page.getByText('Архивное дело', { exact: true }).waitFor();
      await app.shot(page, '02-chief-archived');
    });
  });

  // ── Superuser (superadmin) ────────────────────────────────────────
  await app.as(SUPER, PW[SUPER], async (page) => {
    await r.step(SUPER, 'все 6 разделов в меню', async () => {
      await page.waitForURL('**/overview');
      assert.deepEqual(await navLabels(page), ['Общий обзор', 'Реестр дел', 'Сигналы надзора', 'Задачи и сроки', 'Пользователи', 'Справочники']);
    });
    await r.step(SUPER, 'видит архивное дело Алмалинского ОВД', async () => {
      await page.goto(`${BASE}/registry?filter=archived`);
      await page.getByRole('link', { name: CHILD }).waitFor();
    });
    await r.step(SUPER, 'создание карточки за инспектора Бостандыкского ОВД', async () => {
      await page.goto(`${BASE}/registry`);
      await page.getByRole('button', { name: 'Создать карточку' }).click();
      await dialog(page).getByLabel(/Ответственный инспектор/).selectOption({ label: `${NAMES[INSP_B]} · Бостандыкское ОВД` });
      await fillNewCase(page, CHILD_SUPER);
      await submitDialog(page, 'Создать карточку');
      await page.getByRole('heading', { name: CHILD_SUPER }).waitFor();
      superCaseId = caseIdFromUrl(page);
    });
    await r.step(SUPER, 'правка карточки, «Проверено», замечание инспектору', async () => {
      await page.getByRole('button', { name: 'Редактировать' }).click();
      await dialog(page).getByLabel(/Класс или курс/).fill('7 класс');
      await submitDialog(page, 'Сохранить изменения');
      await page.getByRole('button', { name: 'Проверено' }).click();
      await toast(page, 'Карточка отмечена проверенной');
      await raiseSignal(page, { text: `Замечание суперадминистратора ${RUN}`, section: 'Основные сведения', executor: `${NAMES[INSP_B]} · Инспектор` });
    });
    await r.step(SUPER, 'архивирование: запрос и одобрение', async () => {
      await page.getByRole('button', { name: 'Основные сведения' }).click();
      await page.getByRole('button', { name: 'Запросить архивирование' }).click();
      await dialog(page).getByLabel(/Подтверждающий документ/).setInputFiles(PDF);
      await dialog(page).getByLabel(/Пояснение/).fill('Тестовое завершение.');
      await submitDialog(page, 'Отправить руководителю ОВД');
      await page.getByRole('button', { name: 'Рассмотреть запрос и документы' }).click();
      await submitDialog(page, 'Одобрить и архивировать');
      await page.getByText('Архивное дело', { exact: true }).waitFor();
    });
  });
  await app.as(INSP_B, PW[INSP_B], async (page) => {
    await r.step(INSP_B, 'видит дело, созданное за него суперадминистратором, и его замечание', async () => {
      await page.goto(`${BASE}/signals`);
      await page.getByRole('row').filter({ hasText: `Замечание суперадминистратора ${RUN}` }).waitFor();
      await openCase(page, BASE, superCaseId);
      await page.getByRole('heading', { name: CHILD_SUPER }).waitFor();
    });
  });

  // ── Separation from ДТП (API) ─────────────────────────────────────
  if (process.env.E2E_SKIP_DTP) {
    r.skip(INSP1, 'API ДТП → 403', 'на стенде нет ДТП-эндпоинтов; покрыто тестами бэкенда auth');
    r.skip(SUPER, 'API ДТП → 200', 'на стенде нет ДТП-эндпоинтов; покрыто тестами бэкенда auth');
  } else {
    await r.step(INSP1, 'API ДТП (/prosecutor/districts/) → 403', async () => {
      assert.equal(await apiStatus(API, INSP1, PW[INSP1], '/api/v1/prosecutor/districts/'), 403);
    });
    await r.step(SUPER, 'API ДТП → 200 (суперпользователь — во все системы)', async () => {
      assert.equal(await apiStatus(API, SUPER, PW[SUPER], '/api/v1/prosecutor/districts/'), 200);
    });
  }

  await browser.close();
  const failed = r.rows.filter((row) => !row.ok).length;
  writeFileSync(new URL('./report.json', import.meta.url), JSON.stringify({ run: RUN, base: BASE, caseIds: [caseId, superCaseId], tempLogin, rows: r.rows, pageErrors: app.errors }, null, 2));
  console.log(`\n${r.rows.length - failed}/${r.rows.length} шагов прошли · ошибок страниц: ${app.errors.length}${app.errors.length ? `\n${app.errors.join('\n')}` : ''}`);
  console.log(`Тестовые данные: дела ${caseId}, ${superCaseId}; пользователь ${tempLogin}; справочник «ТЕСТ Е2Е ОВД ${RUN}»`);
  if (failed || app.errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\nFAIL: ${err.message.split('\n')[0]}`);
  process.exitCode = 1;
});
