// Раздел «Слова»: Сегодня, занятие, Поток, 25-й кадр, Настройки (бывшее приложение Word_Memory).
import { LANGUAGES, loadWords, mergeQueue } from './data.js';
import { loadMnemonics } from '../mnemonics.js';
import { summary, forecast, freshWords, wordsForSource, SOURCES, dayKey } from './session.js';
import { loadProgress, saveProgress, loadSettings, saveSettings, validProgress, emptyProgress } from './storage.js';
import { createSession, nextDueText, startedToday } from './learn.js';
import { createStream } from './stream.js';
import { createFlash } from './flash.js';
import { loadSessionState, saveSessionState, clearSessionState } from '../state.js';
import { LEVELS, levelOf } from './levels.js';

const SUBVIEWS = ['today', 'session', 'stream', 'flash', 'settings'];

// root — секция раздела; navigate(sub) — сменить адрес на подраздел (оболочка вызовет show).
export function createWords(root, { navigate }) {
  const $ = (id) => root.querySelector(`#${id}`);
  const state = { lang: null, core: [], words: [], progress: emptyProgress(), settings: loadSettings() };
  let current = 'today';

  // В настройках — список готовых значений; время со шкалы знакомства (например, 3,5 с)
  // добавляется в список, чтобы поле не оказалось пустым.
  function syncSettingsIntro() {
    const select = $('set-intro');
    const value = String(state.settings.introSeconds);
    if (![...select.options].some((o) => o.value === value)) {
      select.add(new Option(`${value.replace('.', ',')} с на слово`, value));
    }
    select.value = value;
  }

  function updateSettings(patch) {
    Object.assign(state.settings, patch);
    saveSettings(state.settings);
  }

  const save = () => saveProgress(state.lang, state.progress);
  const wordsFor = (kind) => wordsForSource(kind, state.words, state.progress, state.settings, Date.now());
  const rebuild = () => { state.words = mergeQueue(state.core, state.progress.queue, state.mnemonics); };

  const session = createSession($('session-view'), {
    get: () => state,
    save,
    saveSettings: (patch) => { updateSettings(patch); syncSettingsIntro(); },
    onExit: () => navigate('today'),
    loadState: () => loadSessionState(state.lang),
    saveState: (data) => saveSessionState(state.lang, data),
    clearState: () => clearSessionState(state.lang),
  });
  const stream = createStream($('stream-view'), {
    wordsFor,
    lang: () => state.lang,
    settings: () => state.settings,
    saveSettings: updateSettings,
  });
  const flash = createFlash($('flash-view'), { wordsFor, settings: () => state.settings, saveSettings: updateSettings });

  // --- Подразделы ------------------------------------------------------------

  function stop() {
    session.stop();
    stream.stop();
    flash.stop();
  }

  function show(name) {
    if (!SUBVIEWS.includes(name)) name = 'today';
    // Открытое занятие при уходе на другую вкладку замирает, а при возврате на «Сегодня»
    // продолжается с того же места.
    if (name === 'today' && session.isActive()) name = 'session';
    // Адрес занятия после перезагрузки: продолжить сохранённое, а если нечего — на «Сегодня».
    if (name === 'session' && state.lang && !session.isActive() && !session.resume()) name = 'today';
    current = name;
    if (name === 'session') session.wake();
    else session.suspend();
    if (name === 'stream') stream.wake();
    else stream.suspend();
    if (name !== 'flash') flash.stop();
    for (const view of SUBVIEWS) $(`${view}-view`).hidden = view !== name;
    const tab = name === 'session' ? 'today' : name;
    root.querySelectorAll('.subtabs a').forEach((a) => {
      if (a.dataset.sub === tab) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    if (!state.lang) return;
    if (name === 'today') renderToday();
    if (name === 'stream') stream.syncControls();
    if (name === 'flash') flash.syncControls();
    if (name === 'settings') renderSettings();
  }

  // --- Сегодня ---------------------------------------------------------------

  const stat = (value, label) =>
    `<div class="stat"><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`;

  function dayLabel(offset, now) {
    if (offset === 0) return 'Сегодня';
    if (offset === 1) return 'Завтра';
    return new Date(now + offset * 86_400_000).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function renderToday() {
    const now = Date.now();
    const s = summary(state.words, state.progress, now);
    const fresh = freshWords(state.words, state.progress, state.settings.newPerDay, now).length;
    const queued = state.progress.queue.filter((e) => !(`${e.word}|${e.pos}` in state.progress.cards)).length;
    $('stats').innerHTML = [
      stat(s.due, 'к повторению сегодня'),
      stat(fresh, 'новых слов сегодня'),
      stat(s.learning, 'в изучении'),
      stat(s.learned, 'запомнено надолго'),
      stat(s.streak, 'дней подряд'),
      stat(`${s.started} / ${s.total}`, 'начато слов'),
    ].join('');
    // Сколько начатых слов на каждом уровне проверки.
    const byLevel = { 1: 0, 2: 0, 3: 0 };
    const ids = new Set(state.words.map((e) => `${e.word}|${e.pos}`));
    for (const [id, card] of Object.entries(state.progress.cards)) if (ids.has(id)) byLevel[levelOf(card)] += 1;
    $('levels-line').textContent = state.settings.check === 'self' || !s.started
      ? ''
      : `По уровням: ${Object.entries(LEVELS).map(([n, l]) => `${n}. ${l.name.toLowerCase()} — ${byLevel[n]}`).join(' · ')}`;
    $('queue-hint').textContent = queued
      ? `Из словаря добавлено и ждёт изучения: ${queued} — эти слова идут первыми среди новых.`
      : 'Чтобы учить конкретное слово, найдите его в словаре и нажмите «Учить».';

    const start = $('start');
    const left = session.pending();
    const work = left || s.due + fresh;
    start.disabled = !work;
    start.textContent = left ? `Продолжить занятие · ${left}` : work ? `Начать занятие · ${work}` : 'Начать занятие';
    $('start-hint').textContent = work ? '' : `На сегодня всё. ${nextDueText(state.progress, now)}`;
    // Пройти обучение снова — когда слова сегодня уже начаты (незаконченное занятие заменится новым).
    const today = startedToday(state.words, state.progress, now).length;
    $('restart').hidden = !today;
    $('restart').textContent = `Пройти обучение снова · ${today}`;

    const days = forecast(state.progress, now);
    const max = Math.max(1, ...days);
    $('forecast').innerHTML = days
      .map((n, i) => `<li><span class="day">${dayLabel(i, now)}</span>
        <span class="bar" style="width:${(n / max) * 100}%"></span><span class="num">${n}</span></li>`)
      .join('');
  }

  $('start').addEventListener('click', () => {
    if (!session.resume()) session.start();
    show('session');
    // Адрес занятия — чтобы после перезагрузки оно открылось само.
    navigate('session');
  });

  $('restart').addEventListener('click', () => {
    if (!session.restartToday()) return;
    show('session');
    navigate('session');
  });

  // --- Настройки -------------------------------------------------------------

  function renderSettings() {
    $('set-new').value = String(state.settings.newPerDay);
    $('set-check').value = state.settings.check;
    $('set-order').value = state.settings.cardOrder ?? 'random';
    syncSettingsIntro();
    $('set-autospeak').checked = state.settings.autospeak;
    $('backup-status').textContent = '';
    $('reset').textContent = `Сбросить прогресс: ${LANGUAGES[state.lang].label.toLowerCase()}`;
  }

  $('set-new').addEventListener('change', (e) => updateSettings({ newPerDay: Number(e.target.value) }));
  $('set-check').addEventListener('change', (e) => updateSettings({ check: e.target.value }));
  $('set-order').addEventListener('change', (e) => updateSettings({ cardOrder: e.target.value }));
  $('set-intro').addEventListener('change', (e) => updateSettings({ introSeconds: Number(e.target.value) }));
  $('set-autospeak').addEventListener('change', (e) => updateSettings({ autospeak: e.target.checked }));

  $('export').addEventListener('click', () => {
    const data = { app: 'Word_Memory', version: 1, lang: state.lang, exported: new Date().toISOString(), progress: state.progress };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `words-${state.lang}-${dayKey(Date.now())}.json` });
    a.click();
    URL.revokeObjectURL(url);
    $('backup-status').textContent = 'Копия сохранена в папку загрузок.';
  });

  $('import').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const status = $('backup-status');
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'Word_Memory' || !LANGUAGES[data.lang] || !validProgress(data.progress)) throw new Error('format');
      const progress = { queue: [], ...data.progress };
      saveProgress(data.lang, progress);
      if (data.lang === state.lang) {
        state.progress = progress;
        rebuild();
      }
      status.textContent = `Прогресс загружен (${LANGUAGES[data.lang].label.toLowerCase()}, слов: ${Object.keys(progress.cards).length}).`;
    } catch {
      status.textContent = 'Не получилось прочитать файл: это не копия прогресса.';
    }
  });

  // Сброс в два нажатия вместо confirm().
  let resetArmed = null;
  $('reset').addEventListener('click', () => {
    const button = $('reset');
    if (!resetArmed) {
      button.textContent = 'Нажмите ещё раз — прогресс удалится без возможности вернуть';
      resetArmed = setTimeout(() => {
        resetArmed = null;
        renderSettings();
      }, 4000);
      return;
    }
    clearTimeout(resetArmed);
    resetArmed = null;
    state.progress = emptyProgress();
    rebuild();
    save();
    renderSettings();
    $('backup-status').textContent = 'Прогресс сброшен.';
  });

  // --- Язык ------------------------------------------------------------------

  const options = Object.entries(SOURCES).map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  $('stream-source').innerHTML = options;
  $('flash-source').innerHTML = options;

  async function setLang(lang) {
    if (lang === state.lang) return;
    stop();
    stream.reset();
    flash.reset();
    state.lang = lang;
    state.core = [];
    state.words = [];
    $('words-status').textContent = 'Загрузка слов…';
    try {
      state.core = await loadWords(lang);
      state.mnemonics = await loadMnemonics(lang);
    } catch (error) {
      $('words-status').textContent = `${error.message}. Обновите страницу.`;
      return;
    }
    if (state.lang !== lang) return; // язык успели переключить ещё раз
    $('words-status').textContent = '';
    state.progress = loadProgress(lang);
    rebuild();
    show(current);
  }

  // Прогресс мог измениться снаружи (кнопка «Учить» в словаре) — перечитать.
  function refresh() {
    if (!state.lang || session.isActive()) return;
    state.progress = loadProgress(state.lang);
    rebuild();
    if (!root.hidden && current === 'today') renderToday();
  }

  // Уход из раздела «Слова»: занятие и поток замирают и продолжатся при возврате.
  function suspend() {
    session.suspend();
    stream.suspend();
    flash.stop();
  }

  return { setLang, show, stop, suspend, refresh, isBusy: () => session.isActive() || stream.isRunning() };
}
