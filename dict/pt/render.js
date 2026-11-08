// Вывод статей португальского словаря (из Dicionario_Portugues/js/app.js).
import { PERSONS, IMPERATIVE_PERSONS, TENSES, IMPERATIVES } from './conjugation.js';
import { escapeHtml, entryMeta } from './format.js';

function renderTable({ label, ru }, forms, persons) {
  const rows = forms
    .map((form, i) => `<tr><td class="person">${persons[i]}</td><td class="speak" lang="pt">${escapeHtml(form)}</td></tr>`)
    .join('');
  return `
    <table class="tense">
      <caption><span lang="pt">${label}</span><small>${ru}</small></caption>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderConjugation(conjugated) {
  const tables = [
    ...TENSES.filter(({ key }) => conjugated[key]).map((t) => renderTable(t, conjugated[t.key], PERSONS)),
    ...IMPERATIVES.filter(({ key }) => conjugated[key]).map((t) => renderTable(t, conjugated[t.key], IMPERATIVE_PERSONS)),
  ].join('');

  const extra = [
    conjugated.participio && `Particípio: <b class="speak" lang="pt">${escapeHtml(conjugated.participio)}</b>`,
    conjugated.gerundio && `Gerúndio: <b class="speak" lang="pt">${escapeHtml(conjugated.gerundio)}</b>`,
  ].filter(Boolean).join(' · ');

  return `
    <details class="conjugation">
      <summary>Спряжение</summary>
      <div class="tenses">${tables}</div>
      ${extra ? `<p class="verb-forms">${extra}</p>` : ''}
    </details>`;
}

// action — HTML кнопки справа от слова («Учить»).
export function renderEntry(entry, action = '') {
  const meta = entryMeta(entry);
  const examples = (entry.examples ?? [])
    .map((ex) => `<li><span class="ex speak" lang="pt">${escapeHtml(ex.pt)}</span> — ${escapeHtml(ex.ru)}</li>`)
    .join('');

  return `
    <li class="entry">
      <div class="entry-head">
        <h2 class="entry-word speak" lang="pt" tabindex="0" title="Прослушать">${escapeHtml(entry.word)}</h2>
        ${meta ? `<span class="entry-meta">${escapeHtml(meta)}</span>` : ''}
        ${action}
      </div>
      <p class="entry-translations">${entry.translations.map(escapeHtml).join(', ')}</p>
      ${examples ? `<ul class="entry-examples">${examples}</ul>` : ''}
      ${entry.conjugated ? renderConjugation(entry.conjugated) : ''}
    </li>`;
}

// Подсказка при опечатке; для формы глагола в скобках — инфинитив.
export function renderHint({ text, entry }) {
  const link = `<a href="?q=${encodeURIComponent(text)}" data-hint="${escapeHtml(text)}">${escapeHtml(text)}</a>`;
  return text === entry.word || !entry.conjugated ? link : `${link} (${escapeHtml(entry.word)})`;
}

// Пример к слову для раздела «Слова».
export const firstExample = (entry) => (entry.examples?.[0] ? { text: entry.examples[0].pt, ru: entry.examples[0].ru } : null);
