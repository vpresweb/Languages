// Раздел «Словарь»: поиск по английскому или португальскому словарю и тест глаголов.
// Языковая часть (поиск, вывод статей, тест) — в dict/en и dict/pt; здесь — общий интерфейс
// и кнопка «Учить», которая отправляет слово в раздел «Слова».
import { compactEntry } from './words/data.js';
import { loadProgress, enqueue, loadMyMnemonics, saveMyMnemonic, MY_MNEMONIC_MAX } from './words/storage.js';
import { escapeHtml } from './words/data.js';
import { loadDictState, saveDictState } from './state.js';
import { loadMnemonics, attachMnemonics } from './mnemonics.js';

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

  // Своя ассоциация: у слов в изучении — ссылка «✎», после «Учить» у слова без ассоциации
  // поле открывается само. editing — слово, у которого поле сейчас открыто.
  let editing = null;
  function myMnemonicHtml(entry, index, state, own) {
    if (state === 'new') return '';
    const has = Boolean(own[id(entry)]);
    if (editing !== id(entry)) {
      return `<button type="button" class="link-button my-mnemonic-edit" data-mm-edit="${index}">
        ✎ ${has ? 'Изменить свою ассоциацию' : 'Своя ассоциация'}</button>`;
    }
    return `
      <form class="my-mnemonic" data-mm-form="${index}">
        <label class="my-mnemonic-label" for="mm-input">💡 Своя ассоциация — фраза, похожая на слово по звучанию</label>
        <input id="mm-input" type="text" maxlength="${MY_MNEMONIC_MAX}" autocomplete="off"
          placeholder="например: abatanado — а ботану надо" value="${escapeHtml(own[id(entry)] ?? '')}">
        <div class="row-buttons">
          <button type="submit">Сохранить</button>
          <button type="button" class="link-button" data-mm-cancel>Отмена</button>
          ${has ? '<button type="button" class="link-button" data-mm-delete>Удалить свою</button>' : ''}
        </div>
      </form>`;
  }

  // Статья словаря со своей ассоциацией вместо встроенной и полем для неё.
  function renderFound(entry, index, progress, own) {
    const shown = own[id(entry)] ? { ...entry, mnemonic: own[id(entry)] } : entry;
    const html = mod.renderEntry(shown, learnButton(progress, entry, index));
    const at = html.lastIndexOf('</li>');
    const extra = myMnemonicHtml(entry, index, learnState(progress, entry), own);
    return at < 0 ? html + extra : html.slice(0, at) + extra + html.slice(at);
  }

  function currentMode() {
    return form.querySelector('input[name="mode"]:checked')?.value ?? 'all';
  }

  function update() {
    if (!mod) return;
    const query = input.value;
    found = mod.search(entries, query, currentMode());
    const progress = loadProgress(lang);
    const own = loadMyMnemonics(lang);
    results.innerHTML = found.map((e, i) => renderFound(e, i, progress, own)).join('');
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
    saveDictState(lang, { q: query.trim(), mode: currentMode() });
    const url = new URL(location.href);
    if (query.trim()) url.searchParams.set('q', query.trim());
    else url.searchParams.delete('q');
    history.replaceState(null, '', url);
  }

  function renderModes(checked = currentMode()) {
    modeBox.innerHTML = mod.MODES
      .map(([value, label], i) => `<label><input type="radio" name="mode" value="${value}"
        ${value === checked || (i === 0 && !mod.MODES.some(([v]) => v === checked)) ? 'checked' : ''}> ${label}</label>`)
      .join('');
  }

  async function load(code) {
    if (cache.has(code)) return cache.get(code);
    const m = await modules[code]();
    const [dict, mn] = await Promise.all([m.loadDictionary(m.DATA_URL), loadMnemonics(code)]);
    const data = { mod: m, entries: attachMnemonics(dict, mn) };
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
    // Последний поиск на этом языке; слово из ссылки (?q=) при первом открытии — важнее.
    const last = loadDictState(code);
    if (initial) initial = null;
    else input.value = typeof last?.q === 'string' ? last.q : '';
    renderModes(typeof last?.mode === 'string' ? last.mode : undefined);
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

  let initial = new URLSearchParams(location.search).get('q');
  if (initial) input.value = initial;

  input.addEventListener('input', () => {
    editing = null; // новый поиск — открытое поле своей ассоциации закрывается
    update();
  });
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
  // Перерисовать результаты, не сбивая прокрутку и не меняя адрес.
  function rerender() {
    const y = window.scrollY;
    update();
    window.scrollTo(0, y);
    results.querySelector('.my-mnemonic input')?.focus({ preventScroll: true });
  }

  results.addEventListener('click', (event) => {
    if (!mod) return;
    const learn = event.target.closest('[data-learn]');
    if (learn) {
      const entry = found[Number(learn.dataset.learn)];
      if (!entry) return;
      enqueue(lang, compactEntry(entry, mod.firstExample(entry)));
      // Нет ни встроенной, ни своей ассоциации — сразу предложить свою.
      if (!entry.mnemonic && !loadMyMnemonics(lang)[id(entry)]) editing = id(entry);
      rerender();
      onLearn?.(lang);
      return;
    }
    const edit = event.target.closest('[data-mm-edit]');
    if (edit) {
      const entry = found[Number(edit.dataset.mmEdit)];
      if (entry) editing = id(entry);
      rerender();
      return;
    }
    const form = event.target.closest('[data-mm-form]');
    if (!form) return;
    const entry = found[Number(form.dataset.mmForm)];
    if (event.target.closest('[data-mm-cancel]')) {
      editing = null;
      rerender();
    } else if (event.target.closest('[data-mm-delete]') && entry) {
      saveMyMnemonic(lang, id(entry), '');
      editing = null;
      rerender();
      onLearn?.(lang);
    }
  });
  results.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-mm-form]');
    if (!form || !mod) return;
    event.preventDefault();
    const entry = found[Number(form.dataset.mmForm)];
    if (!entry) return;
    saveMyMnemonic(lang, id(entry), form.querySelector('input').value);
    editing = null;
    rerender();
    onLearn?.(lang);
  });

  return { setLang, show, escapeHtml };
}
