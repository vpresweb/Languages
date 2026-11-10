// Наборы слов. Файлы data/words-en.json и data/words-pt.json собираются скриптом
// scripts/build-data.mjs из основной части словарей (порядок — по частоте).

import { loadMnemonics, attachMnemonics } from '../mnemonics.js';

export const LANGUAGES = {
  en: { name: 'English', label: 'Английский', code: 'en', file: 'data/words-en.json' },
  pt: { name: 'Português', label: 'Португальский', code: 'pt', file: 'data/words-pt.json' },
};

const MAX_TRANSLATIONS = 3;

// Слово из словаря в формате раздела «Слова» (для очереди «Учить»).
export function compactEntry(entry, example) {
  const out = { word: entry.word, pos: entry.pos, translations: entry.translations.slice(0, MAX_TRANSLATIONS) };
  if (entry.gender) out.gender = entry.gender;
  if (example?.text && example.ru) out.example = example;
  if (entry.mnemonic) out.mnemonic = entry.mnemonic;
  return out;
}

// Список для занятий: сначала слова, добавленные из словаря кнопкой «Учить» (в порядке
// добавления), затем основные — по частоте. Повторы убираются.
export function mergeQueue(core, queue = [], mnemonics = {}) {
  const id = (e) => `${e.word}|${e.pos}`;
  const queued = new Set(queue.map(id));
  // Ассоциация для слова из очереди: из полного файла ассоциаций (там и редкие слова словаря),
  // затем из основного списка, затем сохранённая при добавлении (могла устареть).
  const byId = new Map(core.map((e) => [id(e), e]));
  const withMnemonic = queue.map((q) => {
    const text = mnemonics[id(q)] || byId.get(id(q))?.mnemonic || q.mnemonic;
    return text && text !== q.mnemonic ? { ...q, mnemonic: text } : q;
  });
  return [...withMnemonic, ...core.filter((e) => !queued.has(id(e)))];
}

export const POS_NAMES = {
  noun: 'сущ.',
  verb: 'гл.',
  adj: 'прил.',
  adv: 'нареч.',
  prep: 'предлог',
  pron: 'местоим.',
  conj: 'союз',
  interj: 'межд.',
  num: 'числ.',
  det: 'опред.',
  phrase: 'выражение',
};

const GENDERS = { m: 'м. р.', f: 'ж. р.', mf: 'м./ж. р.' };

export function entryMeta(entry) {
  const parts = [POS_NAMES[entry.pos] ?? entry.pos];
  if (entry.gender && GENDERS[entry.gender]) parts.push(GENDERS[entry.gender]);
  return parts.filter(Boolean).join(', ');
}

const cache = new Map();

export async function loadWords(lang) {
  if (cache.has(lang)) return cache.get(lang);
  const response = await fetch(LANGUAGES[lang].file);
  if (!response.ok) throw new Error(`Не удалось загрузить слова: ${response.status}`);
  const words = attachMnemonics(await response.json(), await loadMnemonics(lang));
  cache.set(lang, words);
  return words;
}

export const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
