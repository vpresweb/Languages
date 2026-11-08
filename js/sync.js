// Что и как синхронизируется с учётной записью. Чистые функции — без сети и браузера.
//
// Прогресс всех программ лежит в localStorage сайта vpresweb.github.io под своими ключами.
// Синхронизируются только ключи с прогрессом и настройками; служебные (сессия входа,
// скрытая плашка и т. п.) остаются на устройстве.

export const SYNC_PREFIXES = [
  'wordmem.v1.', // раздел «Слова» (Word_Memory): прогресс по языкам и настройки
  'dictionary.quiz.', // тест форм английских глаголов
  'dicionario.quiz.', // тест спряжения португальских глаголов
  'dictionary.cards.', // карточки прежнего английского словаря
  'dicionario.cards.', // карточки прежнего португальского словаря
  'englishA1.', // курсы
  'enA2:',
  'enB1:',
  'enB2:',
  'pfa1:',
  'pfa2:',
  'languages.', // последнее состояние: раздел, поиск в словаре, незаконченное занятие (js/state.js)
];

export const isSynced = (key) => SYNC_PREFIXES.some((prefix) => key.startsWith(prefix));

// Ключи «последнего состояния»: в значении есть отметка времени at, и при входе
// побеждает более свежее значение — устройства или учётной записи.
export const isLatestWins = (key) => key.startsWith('languages.');

function stampOf(text) {
  try {
    return Number(JSON.parse(text)?.at) || 0;
  } catch {
    return 0;
  }
}

// Значения учётной записи, которые свежее, чем на устройстве: { ключ: строка }.
export function newerOnServer(local, server) {
  const out = {};
  for (const [key, value] of Object.entries(server)) {
    if (isLatestWins(key) && key in local && stampOf(value) > stampOf(local[key])) out[key] = value;
  }
  return out;
}

// Снимок синхронизируемых ключей: { ключ: строка }.
export function snapshot(storage) {
  const out = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && isSynced(key)) out[key] = storage.getItem(key);
  }
  return out;
}

// Быстрый отпечаток строки (FNV-1a) — чтобы помнить, что уже отправлено, не храня копии.
export function fingerprint(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${(h >>> 0).toString(36)}.${text.length}`;
}

// Что изменилось на устройстве с последней отправки.
// pushed — { ключ: отпечаток } отправленных значений.
export function dirty(current, pushed) {
  const upsert = {};
  for (const [key, value] of Object.entries(current)) {
    if (pushed[key] !== fingerprint(value)) upsert[key] = value;
  }
  const remove = Object.keys(pushed).filter((key) => !(key in current));
  return { upsert, remove };
}

// Что делать при входе.
// - 'merge' — вошёл тот же пользователь: отправить изменения устройства, остальное взять с сервера;
// - 'upload' — на устройстве прогресс без учётной записи, а у учётной записи пусто: сохранить его в ней;
// - 'replace' — данные устройства чужие (или учётная запись уже заполнена): взять прогресс с сервера.
export function planLogin({ deviceUser, user, local, serverKeys }) {
  if (deviceUser === user) return 'merge';
  if (!deviceUser && serverKeys.length === 0 && Object.keys(local).length > 0) return 'upload';
  return 'replace';
}
