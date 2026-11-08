import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSynced, snapshot, fingerprint, dirty, planLogin } from '../js/sync.js';

// Минимальная замена localStorage.
function storage(entries) {
  const keys = Object.keys(entries);
  return { length: keys.length, key: (i) => keys[i], getItem: (k) => entries[k] ?? null };
}

test('синхронизируется прогресс программ, а не служебные ключи', () => {
  for (const key of ['wordmem.v1.progress.en', 'wordmem.v1.settings', 'englishA1.week', 'enB2:tab', 'pfa2:week', 'dictionary.quiz.settings', 'dicionario.cards.v2']) {
    assert.ok(isSynced(key), key);
  }
  for (const key of ['sb-abc-auth-token', 'sync.meta', 'sync.backup', 'hub-link.hidden', 'other']) {
    assert.ok(!isSynced(key), key);
  }
});

test('снимок содержит только синхронизируемые ключи', () => {
  const s = storage({ 'wordmem.v1.settings': '{"lang":"pt"}', 'sb-x-auth-token': 'secret', 'enA2:week': '3' });
  assert.deepEqual(snapshot(s), { 'wordmem.v1.settings': '{"lang":"pt"}', 'enA2:week': '3' });
});

test('отпечаток различает значения и стабилен', () => {
  assert.equal(fingerprint('abc'), fingerprint('abc'));
  assert.notEqual(fingerprint('abc'), fingerprint('abd'));
  assert.notEqual(fingerprint(''), fingerprint(' '));
});

test('изменения с последней отправки: новые, изменённые, удалённые', () => {
  const pushed = { a: fingerprint('1'), b: fingerprint('2'), c: fingerprint('3') };
  const current = { a: '1', b: '22', d: '4' };
  assert.deepEqual(dirty(current, pushed), { upsert: { b: '22', d: '4' }, remove: ['c'] });
  assert.deepEqual(dirty({ a: '1' }, { a: fingerprint('1') }), { upsert: {}, remove: [] });
});

test('план при входе', () => {
  const local = { 'wordmem.v1.progress.en': '{}' };
  // тот же пользователь — слить
  assert.equal(planLogin({ deviceUser: 'u1', user: 'u1', local, serverKeys: ['x'] }), 'merge');
  // прогресс без учётной записи + пустая учётная запись — сохранить в ней
  assert.equal(planLogin({ deviceUser: null, user: 'u1', local, serverKeys: [] }), 'upload');
  // учётная запись уже заполнена — взять с сервера
  assert.equal(planLogin({ deviceUser: null, user: 'u1', local, serverKeys: ['x'] }), 'replace');
  // на устройстве данные другого пользователя — никогда не отдавать их новому
  assert.equal(planLogin({ deviceUser: 'u2', user: 'u1', local, serverKeys: [] }), 'replace');
  // на устройстве ничего нет
  assert.equal(planLogin({ deviceUser: null, user: 'u1', local: {}, serverKeys: [] }), 'replace');
});
