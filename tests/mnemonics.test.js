import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { attachMnemonics, mnemonicHtml } from '../js/mnemonics.js';
import { mergeQueue, compactEntry } from '../js/words/data.js';

test('ассоциации: подставляются по слову и части речи, текст экранируется', () => {
  const words = [{ word: 'ler', pos: 'verb', translations: ['читать'] }, { word: 'casa', pos: 'noun', translations: ['дом'] }];
  attachMnemonics(words, { 'ler|verb': 'ЛЕРмонтова <ЧИТАЮ>' });
  assert.equal(words[0].mnemonic, 'ЛЕРмонтова <ЧИТАЮ>');
  assert.equal(words[1].mnemonic, undefined);
  assert.match(mnemonicHtml(words[0]), /&lt;ЧИТАЮ&gt;/);
  assert.equal(mnemonicHtml(words[1]), '');
});

test('ассоциации: слово из очереди «Учить» получает ассоциацию из основного списка', () => {
  const core = [{ word: 'ler', pos: 'verb', translations: ['читать'], mnemonic: 'М' }];
  const queue = [{ word: 'ler', pos: 'verb', translations: ['читать'] }];
  assert.equal(mergeQueue(core, queue)[0].mnemonic, 'М');
  assert.equal(compactEntry({ word: 'ler', pos: 'verb', translations: ['читать'], mnemonic: 'М' }).mnemonic, 'М');
});

for (const lang of ['pt', 'en']) {
  test(`${lang}: ассоциации есть для всех 2000 самых частых слов`, () => {
    const map = JSON.parse(readFileSync(`data/mnemonics-${lang}.json`, 'utf8'));
    const top = JSON.parse(readFileSync(`data/words-${lang}.json`, 'utf8')).slice(0, 2000);
    assert.ok(Object.keys(map).length >= 2000);
    assert.ok(top.every((e) => map[`${e.word}|${e.pos}`]));
  });
}
