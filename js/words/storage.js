// Прогресс и настройки в localStorage браузера. У каждого языка свой прогресс.
// Если хранилище недоступно (приватный режим), всё работает до перезагрузки страницы.

const PROGRESS_KEY = (lang) => `wordmem.v1.progress.${lang}`;
const SETTINGS_KEY = 'wordmem.v1.settings';

export const DEFAULT_SETTINGS = {
  lang: 'en',
  newPerDay: 10,
  check: 'choice', // choice: выбор из 4 вариантов по уровням (levels.js); self: самооценка
  direction: 'forward', // для самооценки — forward: слово → перевод; reverse: перевод → слово; mixed
  autospeak: true,
  introSeconds: 2.5, // знакомство с новыми словами: сколько секунд на слово
  introRounds: 2,
  streamSeconds: 1.5,
  streamReveal: 'together', // together: слово и перевод сразу; after: перевод через полсекунды
  streamSpeak: true,
  streamAudio: false, // аудиорежим потока: перевод вслух, работает в свёрнутой вкладке
  streamRepeat: false,
  flashMs: 40,
  flashGap: 2,
  flashWithTranslation: true,
};

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// cards — карточки повторения; days — дни занятий; queue — слова, добавленные из словаря
// кнопкой «Учить» ({ word, pos, translations, gender?, example? }).
export function emptyProgress() {
  return { cards: {}, days: [], queue: [] };
}

// Проверка структуры: из файла резервной копии может прийти что угодно.
export function validProgress(data) {
  if (!data || typeof data !== 'object' || !data.cards || typeof data.cards !== 'object') return false;
  if (!Array.isArray(data.days)) return false;
  if (data.queue !== undefined && !(Array.isArray(data.queue)
    && data.queue.every((e) => e && typeof e.word === 'string' && Array.isArray(e.translations)))) return false;
  return Object.values(data.cards).every(
    (c) => c && typeof c.due === 'number' && typeof c.interval === 'number' && typeof c.state === 'string',
  );
}

// Ключи те же, что у Word_Memory: сайты на vpresweb.github.io делят localStorage,
// поэтому прогресс, накопленный в Word_Memory, подхватывается здесь.
export function loadProgress(lang) {
  const data = read(PROGRESS_KEY(lang));
  return validProgress(data) ? { queue: [], ...data } : emptyProgress();
}

// Добавить слово в очередь изучения. Возвращает false, если оно уже в очереди или начато.
export function enqueue(lang, item) {
  const progress = loadProgress(lang);
  const id = `${item.word}|${item.pos}`;
  if (id in progress.cards || progress.queue.some((e) => `${e.word}|${e.pos}` === id)) return false;
  progress.queue.push(item);
  saveProgress(lang, progress);
  return true;
}

export function saveProgress(lang, progress) {
  return write(PROGRESS_KEY(lang), progress);
}

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...(read(SETTINGS_KEY) ?? {}) };
}

export const saveSettings = (settings) => write(SETTINGS_KEY, settings);
