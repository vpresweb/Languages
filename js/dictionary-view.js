// Раздел «Словарь»: поиск по английскому или португальскому словарю и тест глаголов.
// Языковая часть (поиск, вывод статей, тест) — в dict/en и dict/pt; здесь — общий интерфейс
// и кнопка «Учить», которая отправляет слово в раздел «Слова».
import { compactEntry } from './words/data.js';
import { loadProgress, enqueue } from './words/storage.js';
import { escapeHtml } from './words/data.js';

const modules = { en: () => import('../dict/en/index.js'), pt: () => import('../dict/pt/index.js') };

// root — секция раздела; onLearn(lang) — вызывается после добавления слова в изучение.
export function createDictionary(root, { onLearn }) {
  const $ = (id) => root.querySelector(`#${id}`);
  const form = $('search-form');
  const input = $('search-input');
  const clearButton = $('search-clear');
  const status = $('dict-status');
  const results = $('results');
  const modeBox = $('search-mode');
  const quizView = $('quiz-view');
  const searchView = $('search-view');

  const cache = new Map(); // lang → { mod, entries }
  let lang = null;
  let mod = null;
  let entries = [];
  let found = [];
  let quizReady = false;
  let current = 'search';

  const id = (entry) => `${entry.word}|${entry.pos}`;

  // Что уже известно о слове в разделе «Слова».
  function learnState(progress, entry) {
    if (id(entry) in progress.cards) return 'started';
    if (progress.queue.some((e) => id(e) === id(entry))) return 'queued';
    return 'new';
  }

  function learnButton(progress, entry, index) {
    const s = learnState(progress, entry);
    if (s === 'started') return '<span class="learn-state">✓ учится</span>';
    if (s === 'queued') return '<span class="learn-state">✓ в очереди</span>';
    return `<button type="button" class="learn-button" data-learn="${index}" title="Добавить в раздел «Слова»">＋ Учить</button>`;
  }

  function currentMode() {
    return form.querySelector('input[name="mode"]:checked')?.value ?? 'all';
  }

  function update() {
    if (!mod) return;
    const query = input.value;
    found = mod.search(entries, query, currentMode());
    const progress = loadProgress(lang);
    results.innerHTML = found.map((e, i) => mod.renderEntry(e, learnButton(progress, e, i))).join('');
    clearButton.hidden = !query;
    if (!query.trim()) {
      status.textContent = `В словаре ${entries.length.toLocaleString('ru-RU')} слов. Начните вводить слово.`;
    } else if (!found.length) {
      const hints = mod.suggest(entries, query, currentMode());
      status.innerHTML = hints.length
        ? `Ничего не найдено. Возможно, вы имели в виду: ${hints.map(mod.renderHint).join(', ')}`
        : 'Ничего не найдено.';
    } else {
      status.textContent = `Найдено: ${found.length}`;
    }
    const url = new URL(location.href);
    if (query.trim()) url.searchParams.set('q', query.trim());
    else url.searchParams.delete('q');
    history.replaceState(null, '', url);
  }

  function renderModes() {
    const checked = currentMode();
    modeBox.innerHTML = mod.MODES
      .map(([value, label], i) => `<label><input type="radio" name="mode" value="${value}"
        ${value === checked || (i === 0 && !mod.MODES.some(([v]) => v === checked)) ? 'checked' : ''}> ${label}</label>`)
      .join('');
  }

  async function load(code) {
    if (cache.has(code)) return cache.get(code);
    const m = await modules[code]();
    const data = { mod: m, entries: await m.loadDictionary(m.DATA_URL) };
    cache.set(code, data);
    return data;
  }

  async function setLang(code) {
    if (code === lang) return;
    lang = code;
    mod = null;
    // Пока грузится словарь другого языка, старые результаты и тест не показываем.
    results.innerHTML = '';
    modeBox.innerHTML = '';
    $('quiz-box').innerHTML = '<p class="hint">Загрузка словаря…</p>';
    quizReady = false;
    input.placeholder = 'Загрузка словаря…';
    status.textContent = 'Загрузка словаря…';
    let data;
    try {
      data = await load(code);
    } catch (error) {
      status.textContent = `${error.message}. Обновите страницу.`;
      return;
    }
    if (lang !== code) return; // язык успели переключить ещё раз
    ({ mod, entries } = data);
    input.placeholder = mod.SEARCH_PLACEHOLDER;
    input.lang = code;
    $('quiz-title').textContent = mod.QUIZ_TITLE;
    quizReady = false;
    renderModes();
    update();
    show(current);
  }

  // sub: 'search' | 'quiz'
  function show(sub) {
    current = sub === 'quiz' ? 'quiz' : 'search';
    searchView.hidden = current !== 'search';
    quizView.hidden = current !== 'quiz';
    root.querySelectorAll('.subtabs a').forEach((a) => {
      if (a.dataset.sub === current) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    if (current === 'quiz' && mod && !quizReady) {
      quizReady = true;
      $('quiz-box').innerHTML = mod.QUIZ_HTML;
      mod.initQuiz(entries, $('quiz-box'));
    }
    if (current === 'search' && mod) update();
  }

  const initial = new URLSearchParams(location.search).get('q');
  if (initial) input.value = initial;

  input.addEventListener('input', update);
  // Только переключатель направления: change от поля поиска приходит при потере фокуса,
  // и перерисовка под курсором съедала бы первый клик.
  form.addEventListener('change', (event) => {
    if (event.target.name === 'mode') update();
  });
  form.addEventListener('submit', (event) => event.preventDefault());
  clearButton.addEventListener('click', () => {
    input.value = '';
    update();
    input.focus();
  });
  status.addEventListener('click', (event) => {
    const hint = event.target.closest('[data-hint]');
    if (!hint) return;
    event.preventDefault();
    input.value = hint.dataset.hint;
    update();
  });
  results.addEventListener('click', (event) => {
    const button = event.target.closest('[data-learn]');
    if (!button || !mod) return;
    const entry = found[Number(button.dataset.learn)];
    if (!entry) return;
    enqueue(lang, compactEntry(entry, mod.firstExample(entry)));
    button.outerHTML = '<span class="learn-state">✓ в очереди</span>';
    onLearn?.(lang);
  });

  return { setLang, show, escapeHtml };
}
