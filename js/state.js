// Последнее состояние приложения: открытый раздел, поиск в словаре, незаконченное занятие.
// Ключи начинаются с «languages.» и синхронизируются с учётной записью; в каждом значении
// есть отметка времени at — при входе с другого устройства побеждает более свежее (см. sync.js).

const ROUTE_KEY = 'languages.route';
const DICT_KEY = (lang) => `languages.dict.${lang}`;
const SESSION_KEY = (lang) => `languages.session.${lang}`;

function read(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...value, at: Date.now() }));
  } catch {
    // хранилище недоступно — состояние живёт до перезагрузки
  }
}

// Записать, только если что-то поменялось: иначе отметка времени сдвигалась бы зря.
function writeIfChanged(key, value) {
  const old = read(key);
  if (old && Object.keys(value).every((k) => old[k] === value[k])) return;
  write(key, value);
}

// { lang, section, sub }
export const loadRoute = () => read(ROUTE_KEY);
export const saveRoute = ({ lang, section, sub }) => writeIfChanged(ROUTE_KEY, { lang, section, sub: sub ?? '' });

// { q, mode }
export const loadDictState = (lang) => read(DICT_KEY(lang));
export const saveDictState = (lang, { q, mode }) => writeIfChanged(DICT_KEY(lang), { q, mode });

// Незаконченное занятие раздела «Слова» (см. packSession в words/session.js).
export const loadSessionState = (lang) => read(SESSION_KEY(lang));
export const saveSessionState = (lang, data) => write(SESSION_KEY(lang), data);
export function clearSessionState(lang) {
  try {
    localStorage.removeItem(SESSION_KEY(lang));
  } catch {
    // нечего делать
  }
}
