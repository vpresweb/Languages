import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LANGUAGES, mergeQueue, compactEntry } from '../js/words/data.js';
import { wordId, freshWords } from '../js/words/session.js';
import { validProgress, emptyProgress } from '../js/words/storage.js';
import { firstExample as enExample } from '../dict/en/render.js';
import { firstExample as ptExample } from '../dict/pt/render.js';
import { COURSES, courseUrl } from '../js/courses.js';

for (const [lang, { file }] of Object.entries(LANGUAGES)) {
  test(`набор слов ${lang}: корректные статьи без повторов, по частоте`, async () => {
    const words = JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'));
    assert.ok(words.length > 9000, `слов: ${words.length}`);
    const ids = new Set();
    for (const entry of words) {
      assert.ok(entry.word?.trim(), 'пустое слово');
      assert.ok(Array.isArray(entry.translations) && entry.translations.length && entry.translations.length <= 3);
      const id = wordId(entry);
      assert.ok(!ids.has(id), `повтор: ${id}`);
      ids.add(id);
    }
    assert.equal(words[0].word, lang === 'en' ? 'be' : 'ser');
  });
}

test('слова из словаря («Учить») идут первыми среди новых, без повторов', () => {
  const core = ['be', 'have', 'do'].map((word) => ({ word, pos: 'verb', translations: ['x'] }));
  const queue = [{ word: 'serendipity', pos: 'noun', translations: ['счастливая случайность'] }, core[2]];
  const merged = mergeQueue(core, queue);
  assert.deepEqual(merged.map((e) => e.word), ['serendipity', 'do', 'be', 'have']);
  const progress = { ...emptyProgress(), queue };
  assert.deepEqual(freshWords(merged, progress, 2, Date.now()).map((e) => e.word), ['serendipity', 'do']);
});

test('статья словаря → слово для запоминания', () => {
  const en = { word: 'go', pos: 'verb', translations: ['идти', 'ехать', 'ходить', 'уходить'], examples: [{ en: 'Go home.', ru: 'Иди домой.' }] };
  assert.deepEqual(compactEntry(en, enExample(en)), {
    word: 'go', pos: 'verb', translations: ['идти', 'ехать', 'ходить'], example: { text: 'Go home.', ru: 'Иди домой.' },
  });
  const pt = { word: 'casa', pos: 'noun', gender: 'f', translations: ['дом'], examples: [{ pt: 'A casa é grande.', ru: 'Дом большой.' }] };
  assert.deepEqual(compactEntry(pt, ptExample(pt)), {
    word: 'casa', pos: 'noun', translations: ['дом'], gender: 'f', example: { text: 'A casa é grande.', ru: 'Дом большой.' },
  });
  assert.deepEqual(compactEntry({ word: 'x', pos: 'noun', translations: ['y'] }, null), { word: 'x', pos: 'noun', translations: ['y'] });
});

test('резервная копия: очередь необязательна, но если есть — проверяется', () => {
  assert.ok(validProgress(emptyProgress()));
  assert.ok(validProgress({ cards: {}, days: [] })); // копия из Word_Memory без очереди
  assert.ok(!validProgress({ cards: {}, days: [], queue: [{ word: 1 }] }));
  assert.ok(!validProgress({ cards: {}, days: [], queue: 'x' }));
});

test('курсы: у каждого языка есть курсы, ссылки на сайты vpresweb.github.io', () => {
  assert.deepEqual(COURSES.en.map((c) => c.level), ['A1', 'A2', 'B1', 'B2']);
  assert.deepEqual(COURSES.pt.map((c) => c.level), ['A1', 'A2']);
  for (const list of Object.values(COURSES)) {
    for (const c of list) assert.match(courseUrl(c), /^https:\/\/vpresweb\.github\.io\/[\w-]+\/$/);
  }
});
