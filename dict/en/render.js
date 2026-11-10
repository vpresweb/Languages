// Вывод статей английского словаря (из Dictionary_English/js/app.js).
import { VERB_FORMS, ADJ_FORMS, variants } from './verbs.js';
import { escapeHtml, entryMeta } from './format.js';

const speakable = (form) => `<b class="speak" lang="en">${escapeHtml(variants(form).join(' / '))}</b>`;

// Формы глагола — таблица, степени сравнения — строка под переводом.
function renderForms(entry) {
  const forms = entry.inflected;
  if (!forms) return '';
  if (entry.pos === 'verb') {
    const rows = VERB_FORMS
      .map(({ key, label, ru }) => `<tr><td class="person" title="${ru}" lang="en">${label}</td><td>${speakable(forms[key])}</td></tr>`)
      .join('');
    return `<table class="verb-table"><tbody>${rows}</tbody></table>`;
  }
  const line = ADJ_FORMS
    .filter(({ key }) => forms[key])
    .map(({ key, label }) => `<span lang="en">${label}</span>: ${speakable(forms[key])}`)
    .join(' · ');
  return line ? `<p class="verb-forms">${line}</p>` : '';
}

// action — HTML кнопки справа от слова («Учить»).
export function renderEntry(entry, action = '') {
  const meta = entryMeta(entry);
  const examples = (entry.examples ?? [])
    .map((ex) => `<li><span class="ex speak" lang="en">${escapeHtml(ex.en)}</span> — ${escapeHtml(ex.ru)}</li>`)
    .join('');

  return `
    <li class="entry">
      <div class="entry-head">
        <h2 class="entry-word speak" lang="en" tabindex="0" title="Прослушать">${escapeHtml(entry.word)}</h2>
        ${meta ? `<span class="entry-meta">${escapeHtml(meta)}</span>` : ''}
        ${action}
      </div>
      <p class="entry-translations">${entry.translations.map(escapeHtml).join(', ')}</p>
      ${entry.mnemonic ? `<p class="mnemonic" title="Ассоциация для запоминания">💡 ${escapeHtml(entry.mnemonic)}</p>` : ''}
      ${renderForms(entry)}
      ${examples ? `<ul class="entry-examples">${examples}</ul>` : ''}
    </li>`;
}

// Подсказка при опечатке; для формы слова в скобках — исходное слово.
export function renderHint({ text, entry }) {
  const link = `<a href="?q=${encodeURIComponent(text)}" data-hint="${escapeHtml(text)}">${escapeHtml(text)}</a>`;
  return text === entry.word || !entry.inflected || entry.translations.includes(text)
    ? link
    : `${link} (${escapeHtml(entry.word)})`;
}

// Пример к слову для раздела «Слова».
export const firstExample = (entry) => (entry.examples?.[0] ? { text: entry.examples[0].en, ru: entry.examples[0].ru } : null);
