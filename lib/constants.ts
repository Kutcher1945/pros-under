export const EDUCATION_STATUSES = ['Обучается', 'Не обучается', 'Завершил обучение', 'Уточняется'];

export const CASE_SECTIONS = ['Основные сведения', 'Основание учёта', 'Документы'];

export const DOCUMENT_TYPES = ['Основание учёта', 'Рапорт', 'Индивидуальный план', 'Уведомление', 'Подтверждение исполнения', 'Документ завершения', 'Другой документ'];

export const GROUND_DOCUMENT = 'Основание учёта';
export const COMPLETION_DOCUMENT = 'Документ завершения';

export const ARCHIVE_REASONS = ['Прекращение основания', 'Достижение 18 лет', 'Подтверждённая передача', 'Исправление ошибочной постановки', 'Иное подтверждённое основание'];
export const ADULTHOOD_REASON = 'Достижение 18 лет';

export const ADULT_AGE = 18;
export const DEFAULT_SIGNAL_DAYS = 3;
/** Mirrors OPEKA_MAX_UPLOAD_MB on the backend (checked again there). */
export const MAX_UPLOAD_MB = 10;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
export const UPLOAD_EXTENSIONS = /\.(pdf|docx|xlsx|jpg|jpeg|png)$/i;
export const UPLOAD_ACCEPT = '.pdf,.docx,.xlsx,.jpg,.jpeg,.png';

export const NO_ACCESS_MESSAGE = 'У учётной записи нет доступа к «Опеке».';

export const PROSECUTOR_ORG = 'Прокуратура Алматы';
export const ADMIN_ORG = 'Управление системой';
export const FUTURE_DATE = 'Дата не может быть позже сегодняшней.';
