// Общие подписи и экранирование для словаря и карточек.
import { isIrregular } from './conjugation.js';

export const POS_LABELS = {
  noun: 'сущ.',
  verb: 'гл.',
  adj: 'прил.',
  adv: 'нареч.',
  prep: 'предл.',
  pron: 'мест.',
  conj: 'союз',
  interj: 'межд.',
  num: 'числ.',
  phrase: 'выражение',
};

export const GENDER_LABELS = { m: 'м. р.', f: 'ж. р.' };

export function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

export function verbType(entry) {
  if (entry.pos !== 'verb') return null;
  if (isIrregular(entry.conjugation)) return 'неправильный';
  return entry.conjugation?.participio ? 'правильный, неправ. причастие' : 'правильный';
}

export function entryMeta(entry) {
  return [POS_LABELS[entry.pos] ?? entry.pos, GENDER_LABELS[entry.gender], verbType(entry)]
    .filter(Boolean)
    .join(', ');
}
