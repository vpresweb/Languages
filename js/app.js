// Оболочка: язык (English / Português), разделы «Словарь», «Слова», «Курсы» и учётная запись.
// Адрес: #/<язык>/<раздел>/<подраздел>, например #/en/words/stream или #/pt/courses/a2.
import { LANGUAGES } from './words/data.js';
import { loadSettings, saveSettings } from './words/storage.js';
import { initSpeech, setSpeechLang, stopSpeech } from './speech.js';
import { createDictionary } from './dictionary-view.js';
import { createWords } from './words/view.js';
import { createCourses } from './courses.js';
import { initAccount, accountConfigured } from './account.js';
import { initAccountUi } from './account-ui.js';
import { loadRoute, saveRoute } from './state.js';

const $ = (id) => document.getElementById(id);
const SECTIONS = ['dict', 'words', 'courses'];
const DEFAULT_SUB = { dict: 'search', words: 'today', courses: '' };

let route = { lang: 'en', section: 'words', sub: 'today' };
let dictionary;
let words;
let courses;

const href = (lang, section, sub = '') => `#/${lang}/${section}${sub ? `/${sub}` : ''}`;
const go = (section, sub = '') => { location.hash = href(route.lang, section, sub); };

function parseHash(hash, fallbackLang) {
  const [lang, section, sub] = hash.replace(/^#\/?/, '').split('/');
  const l = LANGUAGES[lang] ? lang : fallbackLang;
  const s = SECTIONS.includes(section) ? section : 'words';
  return { lang: l, section: s, sub: sub || DEFAULT_SUB[s] };
}

// Последний подраздел каждого раздела (по языкам): ссылка раздела ведёт туда, где были.
const LAST_SUBS_KEY = 'languages.lastSubs';
function loadLastSubs() {
  try {
    const data = JSON.parse(localStorage.getItem(LAST_SUBS_KEY));
    return data && typeof data === 'object' ? data : {};
  } catch { return {}; }
}
function saveLastSubs(data) {
  try { localStorage.setItem(LAST_SUBS_KEY, JSON.stringify(data)); } catch { /* без памяти */ }
}
const lastSub = loadLastSubs();
const sectionSub = (lang, section) => {
  const sub = lastSub[lang]?.[section];
  return typeof sub === 'string' ? sub : '';
};

// Звук в курсе (озвучка в iframe того же сайта) при уходе в другой раздел — остановить.
function stopCourseMedia() {
  try { $('course-frame')?.contentWindow?.speechSynthesis?.cancel(); } catch { /* другой сайт */ }
}

function updateLinks() {
  document.querySelectorAll('.tabs [data-section]').forEach((a) => {
    a.href = href(route.lang, a.dataset.section, sectionSub(route.lang, a.dataset.section));
    if (a.dataset.section === route.section) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.querySelectorAll('#dict-section .subtabs a').forEach((a) => { a.href = href(route.lang, 'dict', a.dataset.sub); });
  document.querySelectorAll('#words-section .subtabs a').forEach((a) => { a.href = href(route.lang, 'words', a.dataset.sub); });
  document.querySelectorAll('.lang-switch [data-lang]').forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.lang === route.lang));
  });
  $('home-link').href = href(route.lang, 'words');
}

async function apply() {
  const next = parseHash(location.hash, route.lang);
  const langChanged = next.lang !== route.lang;
  const sectionChanged = next.section !== route.section;
  route = next;
  saveRoute(route);
  if (langChanged || sectionChanged) stopSpeech();
  if (langChanged) saveSettings({ ...loadSettings(), lang: route.lang });
  setSpeechLang(route.lang);
  updateLinks();

  lastSub[route.lang] = { ...lastSub[route.lang], [route.section]: route.sub };
  saveLastSubs(lastSub);
  updateLinks();

  for (const s of SECTIONS) $(`${s}-section`).hidden = s !== route.section;
  if (route.section !== 'words') words.suspend();
  // Курс не выгружается при уходе в другой раздел — при возврате он открыт там же
  // (выгружается только при выходе к списку курсов или смене языка).
  if (route.section !== 'courses') stopCourseMedia();
  document.body.classList.toggle('wide', route.section === 'courses' && Boolean(route.sub));

  if (route.section === 'dict') {
    dictionary.show(route.sub);
    await dictionary.setLang(route.lang);
  } else if (route.section === 'words') {
    words.show(route.sub);
    await words.setLang(route.lang);
  } else {
    courses.setLang(route.lang);
    courses.show(route.sub);
  }
}

async function start() {
  // Сначала учётная запись: если пользователь вошёл, его прогресс загружается на устройство
  // до того, как разделы его прочитают.
  let ui = null;
  // Ссылки из писем (подтверждение email, смена пароля) приходят с токеном после # —
  // Supabase забирает его, а адрес раздела потом выставляется заново.
  const fromEmail = /access_token=|error_description=/.test(location.hash);
  const recovery = /type=recovery/.test(location.hash);
  if (accountConfigured()) {
    $('words-status').textContent = 'Загрузка прогресса…';
    await initAccount({ timeout: fromEmail ? 10000 : 4000 });
    $('words-status').textContent = '';
  }
  if (fromEmail) history.replaceState(null, '', `${location.pathname}${location.search}`);
  ui = initAccountUi();
  if (recovery) ui.openNewPassword();

  const settings = loadSettings();
  route.lang = LANGUAGES[settings.lang] ? settings.lang : 'en';
  dictionary = createDictionary($('dict-section'), { onLearn: () => words.refresh() });
  words = createWords($('words-section'), { navigate: (sub) => go('words', sub) });
  courses = createCourses($('courses-section'), { navigate: (id) => go('courses', id) });

  document.querySelector('.lang-switch').addEventListener('click', (event) => {
    const button = event.target.closest('[data-lang]');
    if (!button || button.dataset.lang === route.lang) return;
    // Курс другого языка с тем же уровнем может не существовать — открываем список курсов.
    const sub = route.section === 'courses' ? '' : route.sub === 'session' ? 'today' : route.sub;
    location.hash = href(button.dataset.lang, route.section, sub);
  });
  window.addEventListener('hashchange', apply);

  initSpeech((found) => {
    const note = $('voice-note');
    note.hidden = found;
    note.textContent = found
      ? ''
      : `В системе не найден голос для языка «${LANGUAGES[route.lang].label.toLowerCase()}» — слова прочитает голос по умолчанию. Голос можно установить в настройках речи системы.`;
  });

  // Без адреса раздела — открыть то место, где пользователь был в прошлый раз (на любом устройстве).
  if (!location.hash) {
    const last = loadRoute();
    const start = last && LANGUAGES[last.lang] && SECTIONS.includes(last.section)
      ? href(last.lang, last.section, last.sub)
      : href(route.lang, 'words');
    history.replaceState(null, '', `${location.pathname}${location.search}${start}`);
  }
  apply();
}

start();
