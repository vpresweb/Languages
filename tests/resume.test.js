// Последнее состояние: незаконченное занятие и выбор свежего значения при входе.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordId, packSession, unpackSession, dayKey } from '../js/words/session.js';
import { newCard, review, GOOD, AGAIN, DAY } from '../js/words/srs.js';
import { isSynced, isLatestWins, newerOnServer } from '../js/sync.js';

const NOW = new Date(2026, 10, 8, 12, 0).getTime();
const words = ['be', 'have', 'do', 'say', 'go'].map((word) => ({ word, pos: 'verb', translations: ['x'] }));
const [be, have, doo, say, go] = words;
const id = wordId;

function progressWith(cards) {
  return { cards, days: [], queue: [] };
}

test('занятие сохраняется ключами слов, показанная карточка — в начало очереди', () => {
  const packed = packSession({ queue: [doo, say], waiting: [{ entry: have, due: NOW + 60_000 }], fresh: new Set([id(say)]), introDone: true, reviewed: 3, current: be }, NOW);
  assert.deepEqual(packed, {
    day: dayKey(NOW),
    queue: [id(be), id(doo), id(say)],
    waiting: [{ id: id(have), due: NOW + 60_000 }],
    fresh: [id(say)],
    introDone: true,
    reviewed: 3,
  });
});

test('восстановление: сегодняшнее занятие продолжается с того же места', () => {
  const learning = review(newCard(NOW - 120_000), AGAIN, NOW - 120_000);
  const p = progressWith({ [id(be)]: { ...review(newCard(NOW - 3 * DAY), GOOD, NOW - 3 * DAY), due: NOW - 1000 }, [id(have)]: learning });
  const saved = { day: dayKey(NOW), queue: [id(be), id(say)], waiting: [{ id: id(have), due: 0 }], fresh: [id(say)], introDone: false, reviewed: 2 };
  const r = unpackSession(saved, words, p, NOW);
  assert.deepEqual(r.queue.map((e) => e.word), ['be', 'say']);
  assert.deepEqual(r.waiting.map((w) => [w.entry.word, w.due]), [['have', learning.due]]);
  assert.deepEqual(r.fresh, [id(say)]);
  assert.equal(r.introDone, false);
  assert.equal(r.reviewed, 2);
});

test('восстановление: вчерашнее, пустое и испорченное занятие не продолжается', () => {
  const p = progressWith({});
  assert.equal(unpackSession(null, words, p, NOW), null);
  assert.equal(unpackSession({ day: dayKey(NOW - DAY), queue: [id(say)], waiting: [] }, words, p, NOW), null);
  assert.equal(unpackSession({ day: dayKey(NOW), queue: [], waiting: [] }, words, p, NOW), null);
  assert.equal(unpackSession({ day: dayKey(NOW), queue: 'x', waiting: [] }, words, p, NOW), null);
  assert.equal(unpackSession({ day: dayKey(NOW), queue: ['нет|такого'], waiting: [{}] }, words, p, NOW), null);
});

test('восстановление: сделанное на другом устройстве пропускается', () => {
  // be повторено на другом устройстве (срок ушёл на завтра+), go — новое, но уже начато там.
  const p = progressWith({
    [id(be)]: review(newCard(NOW - DAY), GOOD, NOW),
    [id(go)]: review(newCard(NOW), GOOD, NOW),
  });
  p.cards[id(be)].due = NOW + 3 * DAY;
  const saved = { day: dayKey(NOW), queue: [id(be), id(go), id(say)], waiting: [], fresh: [id(go), id(say)], introDone: false, reviewed: 0 };
  const r = unpackSession(saved, words, p, NOW);
  assert.deepEqual(r.queue.map((e) => e.word), ['say']);
  assert.deepEqual(r.fresh, [id(say)]);
});

test('без новых слов знакомство не запускается', () => {
  const p = progressWith({ [id(be)]: { ...review(newCard(NOW - 3 * DAY), GOOD, NOW - 3 * DAY), due: NOW - 1 } });
  const r = unpackSession({ day: dayKey(NOW), queue: [id(be)], waiting: [], fresh: [], introDone: false }, words, p, NOW);
  assert.equal(r.introDone, true);
});

test('последнее состояние синхронизируется, при входе побеждает более свежее', () => {
  assert.ok(isSynced('languages.route'));
  assert.ok(isLatestWins('languages.session.en'));
  assert.ok(!isLatestWins('wordmem.v1.progress.en'));
  const local = {
    'languages.route': JSON.stringify({ lang: 'en', section: 'words', sub: 'today', at: 100 }),
    'languages.dict.en': JSON.stringify({ q: 'go', at: 500 }),
    'wordmem.v1.settings': '{"at":1}',
  };
  const server = {
    'languages.route': JSON.stringify({ lang: 'pt', section: 'courses', sub: 'a2', at: 200 }),
    'languages.dict.en': JSON.stringify({ q: 'be', at: 400 }),
    'languages.session.pt': JSON.stringify({ at: 300 }), // нет на устройстве — возьмёт обычное слияние
    'wordmem.v1.settings': '{"at":9}',
  };
  assert.deepEqual(Object.keys(newerOnServer(local, server)), ['languages.route']);
  assert.deepEqual(newerOnServer({ 'languages.route': 'испорчено' }, { 'languages.route': '{"at":1}' }), { 'languages.route': '{"at":1}' });
});
