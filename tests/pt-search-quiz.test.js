// Поиск по словарю и логика теста на спряжение.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { editDistance, normalize, prepareEntries, search, suggest } from '../dict/pt/dictionary.js';
import { checkAnswer, filterVerbs, isIrregular, makeQuestion, QUIZ_TENSES } from '../dict/pt/quiz.js';

const entries = prepareEntries(JSON.parse(readFileSync(new URL('../data/dict-pt.json', import.meta.url), 'utf8')));
const words = (query, mode) => search(entries, query, mode).map((e) => e.word);

describe('поиск', () => {
  test('normalize убирает регистр, диакритику и ё', () => {
    assert.equal(normalize('  Ação '), 'acao');
    assert.equal(normalize('Ёлка'), 'елка');
  });

  test('точное совпадение идёт первым, диакритика не важна', () => {
    assert.equal(words('agua')[0], 'água');
    assert.equal(words('CASA')[0], 'casa');
  });

  test('поиск по форме глагола', () => {
    assert.equal(words('fiz')[0], 'fazer');
    assert.deepEqual(words('fui').slice(0, 2).sort(), ['ir', 'ser']);
    assert.equal(words('sede')[0], 'sede');
    assert.ok(words('sede').includes('ser'));
  });

  test('направления RU → PT и PT → RU', () => {
    assert.ok(words('быть', 'ru').includes('ser'));
    assert.deepEqual(words('быть', 'pt'), []);
  });

  test('пустой запрос ничего не находит', () => {
    assert.deepEqual(words('   '), []);
  });
});

describe('подсказки при опечатке', () => {
  const hints = (query, mode) => suggest(entries, query, mode).map((h) => h.text);

  test('editDistance: замена, вставка, удаление, перестановка', () => {
    assert.equal(editDistance('vamus', 'vamos'), 1);
    assert.equal(editDistance('casa', 'casas'), 1);
    assert.equal(editDistance('obrigado', 'obigado'), 1);
    assert.equal(editDistance('palavra', 'plaavra'), 1);
    assert.equal(editDistance('gato', 'gato'), 0);
    assert.equal(editDistance('gato', 'elefante', 2), 3);
  });

  test('форма глагола с опечаткой', () => {
    assert.deepEqual(words('vamus'), []);
    const found = suggest(entries, 'vamus');
    assert.ok(found.some((h) => h.text === 'vamos' && h.entry.word === 'ir'));
  });

  test('слово и перевод с опечаткой', () => {
    assert.ok(hints('obigado').includes('obrigado'));
    assert.ok(hints('сабака', 'ru').includes('собака'));
    assert.ok(!hints('сабака', 'pt').includes('собака'));
  });

  test('короткие запросы и далёкие слова не подсказываются', () => {
    assert.deepEqual(hints('xz'), []);
    assert.deepEqual(hints('qqqqqqq'), []);
  });
});

describe('тест на спряжение', () => {
  test('checkAnswer: верно, верно без диакритики, неверно', () => {
    assert.equal(checkAnswer('falámos', 'falámos'), 'correct');
    assert.equal(checkAnswer('falámos', '  Falámos '), 'correct');
    assert.equal(checkAnswer('falámos', 'falamos'), 'accent');
    assert.equal(checkAnswer('não fales', 'nao  fales'), 'accent');
    assert.equal(checkAnswer('falámos', 'falaram'), 'wrong');
    assert.equal(checkAnswer('falámos', ''), 'wrong');
  });

  test('isIrregular и filterVerbs', () => {
    const ser = entries.find((e) => e.word === 'ser');
    const falar = entries.find((e) => e.word === 'falar');
    const ganhar = entries.find((e) => e.word === 'ganhar');
    assert.ok(isIrregular(ser));
    assert.ok(!isIrregular(falar));
    assert.ok(!isIrregular(ganhar), 'только особое причастие — не неправильный по временам');

    const all = filterVerbs(entries, 'all');
    const irregular = filterVerbs(entries, 'irregular');
    const regular = filterVerbs(entries, 'regular');
    assert.ok(all.every((e) => e.pos === 'verb'));
    assert.equal(irregular.length + regular.length, all.length);
    assert.ok(irregular.includes(ser) && regular.includes(falar));
  });

  test('makeQuestion: ответ совпадает с таблицей спряжения', () => {
    const verbs = filterVerbs(entries, 'all');
    const tenses = QUIZ_TENSES.map((t) => t.key);
    for (let i = 0; i < 500; i++) {
      const q = makeQuestion(verbs, { tenses, vos: true });
      assert.equal(q.answer, q.entry.conjugated[q.tense.key][q.personIndex]);
      assert.ok(tenses.includes(q.tense.key));
    }
  });

  test('makeQuestion без vós никогда не спрашивает vós', () => {
    const verbs = filterVerbs(entries, 'all');
    const tenses = QUIZ_TENSES.map((t) => t.key);
    for (let i = 0; i < 500; i++) {
      const q = makeQuestion(verbs, { tenses, vos: false });
      assert.notEqual(q.persons[q.personIndex], 'vós');
    }
  });

  test('makeQuestion учитывает выбранные времена', () => {
    const verbs = filterVerbs(entries, 'all');
    for (let i = 0; i < 100; i++) {
      assert.equal(makeQuestion(verbs, { tenses: ['imperativo'], vos: false }).tense.key, 'imperativo');
    }
  });

  test('makeQuestion возвращает null без времён или глаголов', () => {
    assert.equal(makeQuestion(filterVerbs(entries, 'all'), { tenses: [], vos: false }), null);
    assert.equal(makeQuestion([], { tenses: ['presente'], vos: false }), null);
  });

  test('makeQuestion детерминирован при заданном random', () => {
    const verbs = filterVerbs(entries, 'all');
    const q = makeQuestion(verbs, { tenses: ['presente'], vos: true }, () => 0);
    assert.equal(q.entry, verbs[0]);
    assert.equal(q.personIndex, 0);
    assert.equal(q.answer, verbs[0].conjugated.presente[0]);
  });
});
