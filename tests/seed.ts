import { ADMIN_ORG, PROSECUTOR_ORG } from '@/lib/constants';
import { offsetDay } from '@/lib/dates';
import type { Case, OpekaState, Remark, User } from '@/lib/types';

export const CATEGORIES = [
  'Безнадзорность и беспризорность',
  'Предусмотренные воспитательные меры',
  'Условно-досрочное освобождение',
  'Подозреваемый или обвиняемый без содержания под стражей',
  'Защитное предписание',
  'Иное предусмотренное основание',
];

export const DISTRICTS = ['Алмалинский', 'Бостандыкский', 'Ауэзовский', 'Медеуский', 'Турксибский', 'Жетысуский', 'Наурызбайский', 'Алатауский'];

const USERS: User[] = [
  { id: 'i1', login: 'sadykova', name: 'Алия Садыкова', role: 'inspector', org: 'Алмалинское ОВД', active: true },
  { id: 'i2', login: 'omarov', name: 'Тимур Омаров', role: 'inspector', org: 'Алмалинское ОВД', active: true },
  { id: 'i3', login: 'akhmetov', name: 'Диас Ахметов', role: 'inspector', org: 'Бостандыкское ОВД', active: true },
  { id: 'c1', login: 'nurlanov', name: 'Ерлан Нурланов', role: 'chief', org: 'Алмалинское ОВД', active: true },
  { id: 'p1', login: 'seitova', name: 'Дана Сейтова', role: 'prosecutor', org: PROSECUTOR_ORG, active: true },
  { id: 'a1', login: 'admin', name: 'Администратор', role: 'admin', org: ADMIN_ORG, active: true },
];

const NAMES = ['Асылбеков Данияр', 'Ким Арина', 'Серикова Амина', 'Омаров Арсен', 'Жумабаев Алихан', 'Тлеуберди Айша', 'Иванов Максим', 'Нуртаев Самат', 'Есенова Алина'];
const BIRTH_DATES = ['2010-04-12', '2011-09-23', '2009-12-04', '2010-07-19', '2011-03-05', '2009-06-15', '2010-10-30', '2009-02-27', '2011-08-11'];
const SCHOOLS = [35, 12, 54, 35, 88, 12, 65, 65, 54];
const REVIEW_CYCLE = ['checked', 'new', 'changed'] as const;

function seedCase(name: string, i: number, from: Date, nowIso: string): Case {
  const bostandyk = i > 5;
  const inspector = bostandyk ? 'i3' : i % 3 === 0 ? 'i2' : 'i1';
  const groundDate = offsetDay(-26 - i * 9, from);
  return {
    id: `c${i + 101}`,
    number: `НЛ-2026-${String(i + 128).padStart(4, '0')}`,
    name,
    iin: '',
    dob: BIRTH_DATES[i],
    district: bostandyk ? 'Бостандыкский' : 'Алмалинский',
    address: `Демонстрационный адрес, ${i + 10}`,
    education: 'Обучается',
    school: `Школа №${SCHOOLS[i]}`,
    grade: `${(i % 3) + 8} класс`,
    rep: 'Законный представитель',
    phone: '',
    inspector,
    org: bostandyk ? 'Бостандыкское ОВД' : 'Алмалинское ОВД',
    status: i === 8 ? 'archived' : 'active',
    review: REVIEW_CYCLE[i % 3],
    registered: offsetDay(-25 - i * 9, from),
    end: i === 3 ? offsetDay(6, from) : '',
    grounds: [
      {
        category: i % 2 ? 'Безнадзорность и беспризорность' : 'Предусмотренные воспитательные меры',
        type: 'Решение уполномоченного органа',
        number: `ДЕМО-${120 + i}`,
        date: groundDate,
      },
    ],
    docs: [
      {
        id: `d${i}`,
        type: 'Основание учёта',
        name: 'Документ основания.pdf',
        date: groundDate,
        number: `ДЕМО-${120 + i}`,
        demo: true,
        by: 'i1',
        at: nowIso,
      },
    ],
    history: [{ text: 'Карточка создана. Документ основания добавлен.', by: bostandyk ? 'i3' : 'i1', at: `${offsetDay(-20 - i, from)}T09:00:00Z` }],
  };
}

function seedRemarks(from: Date, nowIso: string): Remark[] {
  const day = (n: number) => offsetDay(n, from);
  return [
    { id: 's1', caseId: 'c102', author: 'c1', executor: 'i1', text: 'Уточните фактический адрес проживания и приложите подтверждающий документ.', section: 'Основные сведения', due: day(2), status: 'open', required: true, created: day(-2), events: [] },
    { id: 's2', caseId: 'c103', author: 'p1', executor: 'i1', text: 'Проверьте дату постановки на учёт: она должна соответствовать приложенному основанию.', section: 'Основание учёта', due: day(-2), status: 'open', required: true, created: day(-5), events: [] },
    { id: 's3', caseId: 'c104', author: 'p1', executor: 'c1', text: 'Проверьте комплектность документов в карточке. Необходимо приложить индивидуальный план.', section: 'Документы', due: day(1), status: 'open', required: true, created: day(-1), events: [] },
    {
      id: 's4',
      caseId: 'c105',
      author: 'c1',
      executor: 'i1',
      text: 'Укажите организацию образования и класс.',
      section: 'Основные сведения',
      due: day(-1),
      status: 'review',
      required: true,
      created: day(-4),
      events: [{ text: 'Сведения об обучении уточнены, данные внесены в карточку.', by: 'i1', at: nowIso, kind: 'reply' }],
    },
    { id: 's5', caseId: 'c102', author: 'p1', text: 'При следующей проверке обратите внимание на актуальность контактных данных представителя.', required: false, created: day(-1), events: [] },
  ];
}

/** Prototype demo dataset as a test fixture — mirrors prosecutor_opeka/demo.py on the backend. */
export function seedState(from: Date = new Date()): OpekaState {
  const nowIso = from.toISOString();
  return {
    users: USERS.map((u) => ({ ...u })),
    cases: NAMES.map((name, i) => seedCase(name, i, from, nowIso)),
    remarks: seedRemarks(from, nowIso),
    categories: [...CATEGORIES],
    orgs: ['Алмалинское ОВД', 'Бостандыкское ОВД'],
    districts: [...DISTRICTS],
  };
}
