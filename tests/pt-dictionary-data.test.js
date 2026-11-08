// Целостность data/dictionary.json и эталонные формы неправильных глаголов.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareEntries } from '../dict/pt/dictionary.js';
import { TENSES } from '../dict/pt/conjugation.js';
import { entryMeta, verbType } from '../dict/pt/format.js';

const raw = JSON.parse(readFileSync(new URL('../data/dict-pt.json', import.meta.url), 'utf8'));
const entries = prepareEntries(raw);
const verb = (word) => entries.find((e) => e.word === word && e.pos === 'verb').conjugated;

const POS = new Set(['noun', 'verb', 'adj', 'adv', 'prep', 'pron', 'conj', 'interj', 'num', 'phrase']);
const CONJUGATION_KEYS = new Set([...TENSES.map((t) => t.key), 'imperativo', 'participio', 'gerundio']);

describe('структура словаря', () => {
  test('у каждой статьи есть слово, известная часть речи и переводы', () => {
    for (const e of raw) {
      assert.ok(e.word?.trim(), JSON.stringify(e));
      assert.ok(POS.has(e.pos), `${e.word}: часть речи ${e.pos}`);
      assert.ok(Array.isArray(e.translations) && e.translations.length, `${e.word}: нет переводов`);
    }
  });

  test('нет повторов слова с той же частью речи', () => {
    const seen = new Set();
    for (const e of raw) {
      const key = `${e.word}|${e.pos}`;
      assert.ok(!seen.has(key), `повтор: ${key}`);
      seen.add(key);
    }
  });

  test('у существительных указан род m или f', () => {
    for (const e of raw.filter((e) => e.pos === 'noun')) {
      assert.ok(e.gender === 'm' || e.gender === 'f', `${e.word}: род ${e.gender}`);
    }
  });

  test('conjugation только у глаголов и только с известными ключами и правильным числом форм', () => {
    for (const e of raw.filter((e) => e.conjugation)) {
      assert.equal(e.pos, 'verb', `${e.word}: conjugation у не-глагола`);
      for (const [key, value] of Object.entries(e.conjugation)) {
        assert.ok(CONJUGATION_KEYS.has(key), `${e.word}: неизвестный ключ ${key}`);
        if (key === 'imperativo') assert.equal(value.length, 5, `${e.word}: ${key}`);
        else if (key !== 'participio' && key !== 'gerundio') assert.equal(value.length, 6, `${e.word}: ${key}`);
      }
    }
  });

  test('у каждого глагола полные таблицы всех времён', () => {
    for (const e of entries.filter((e) => e.pos === 'verb')) {
      for (const { key } of TENSES) assert.equal(e.conjugated[key]?.length, 6, `${e.word}: ${key}`);
      assert.equal(e.conjugated.imperativo?.length, 5, `${e.word}: imperativo`);
      assert.equal(e.conjugated.imperativoNegativo?.length, 5, `${e.word}: imperativoNegativo`);
      assert.ok(e.conjugated.participio && e.conjugated.gerundio, `${e.word}: particípio/gerúndio`);
      for (const form of Object.values(e.conjugated).flat()) {
        assert.ok(typeof form === 'string' && form.trim(), `${e.word}: пустая форма`);
      }
    }
  });
});

describe('отметка правильный / неправильный', () => {
  const type = (word) => verbType(entries.find((e) => e.word === word && e.pos === 'verb'));

  test('глаголы', () => {
    for (const w of ['ser', 'ter', 'fazer', 'pôr', 'sentir', 'dormir', 'manter', 'construir']) assert.equal(type(w), 'неправильный', w);
    for (const w of ['falar', 'comer', 'partir', 'ficar', 'conhecer']) assert.equal(type(w), 'правильный', w);
    for (const w of ['ganhar', 'pagar', 'abrir']) assert.equal(type(w), 'правильный, неправ. причастие', w);
  });

  test('у не-глаголов отметки нет, в подписи статьи она есть', () => {
    assert.equal(verbType(entries.find((e) => e.word === 'casa')), null);
    assert.equal(entryMeta(entries.find((e) => e.word === 'ser')), 'гл., неправильный');
    assert.equal(entryMeta(entries.find((e) => e.word === 'casa')), 'сущ., ж. р.');
  });
});

// Эталонные формы из грамматик европейского португальского.
describe('эталонные формы неправильных глаголов', () => {
  const reference = {
    ser: { presente: ['sou', 'és', 'é', 'somos', 'sois', 'são'], imperfeito: ['era', 'eras', 'era', 'éramos', 'éreis', 'eram'], imperativo: ['sê', 'seja', 'sejamos', 'sede', 'sejam'] },
    estar: { presente: ['estou', 'estás', 'está', 'estamos', 'estais', 'estão'], perfeito: ['estive', 'estiveste', 'esteve', 'estivemos', 'estivestes', 'estiveram'] },
    ter: { presente: ['tenho', 'tens', 'tem', 'temos', 'tendes', 'têm'], imperativo: ['tem', 'tenha', 'tenhamos', 'tende', 'tenham'] },
    ir: { presente: ['vou', 'vais', 'vai', 'vamos', 'ides', 'vão'], perfeito: ['fui', 'foste', 'foi', 'fomos', 'fostes', 'foram'], imperativo: ['vai', 'vá', 'vamos', 'ide', 'vão'] },
    fazer: { perfeito: ['fiz', 'fizeste', 'fez', 'fizemos', 'fizestes', 'fizeram'], futuro: ['farei', 'farás', 'fará', 'faremos', 'fareis', 'farão'], participio: 'feito' },
    dizer: { presente: ['digo', 'dizes', 'diz', 'dizemos', 'dizeis', 'dizem'], participio: 'dito' },
    poder: { perfeito: ['pude', 'pudeste', 'pôde', 'pudemos', 'pudestes', 'puderam'] },
    ver: { presente: ['vejo', 'vês', 'vê', 'vemos', 'vedes', 'veem'], participio: 'visto' },
    vir: { presente: ['venho', 'vens', 'vem', 'vimos', 'vindes', 'vêm'], imperativo: ['vem', 'venha', 'venhamos', 'vinde', 'venham'], participio: 'vindo' },
    dar: { conjuntivo: ['dê', 'dês', 'dê', 'demos', 'deis', 'deem'] },
    'pôr': { presente: ['ponho', 'pões', 'põe', 'pomos', 'pondes', 'põem'], imperativo: ['põe', 'ponha', 'ponhamos', 'ponde', 'ponham'], participio: 'posto' },
    sair: { presente: ['saio', 'sais', 'sai', 'saímos', 'saís', 'saem'], participio: 'saído' },
    rir: { presente: ['rio', 'ris', 'ri', 'rimos', 'rides', 'riem'], conjuntivo: ['ria', 'rias', 'ria', 'riamos', 'riais', 'riam'] },
    abrir: { participio: 'aberto' },
    escrever: { participio: 'escrito' },
  };

  for (const [word, tenses] of Object.entries(reference)) {
    for (const [key, expected] of Object.entries(tenses)) {
      test(`${word}: ${key}`, () => assert.deepEqual(verb(word)[key], expected));
    }
  }
});
