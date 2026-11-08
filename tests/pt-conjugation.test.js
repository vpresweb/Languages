// Генератор спряжения: правильные глаголы, орфографические замены, неправильные формы, повелительное.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { conjugate, allForms, TENSES } from '../dict/pt/conjugation.js';

describe('правильные глаголы', () => {
  test('-ar: falar', () => {
    const c = conjugate('falar');
    assert.deepEqual(c.presente, ['falo', 'falas', 'fala', 'falamos', 'falais', 'falam']);
    assert.deepEqual(c.perfeito, ['falei', 'falaste', 'falou', 'falámos', 'falastes', 'falaram']);
    assert.deepEqual(c.imperfeito, ['falava', 'falavas', 'falava', 'falávamos', 'faláveis', 'falavam']);
    assert.deepEqual(c.futuro, ['falarei', 'falarás', 'falará', 'falaremos', 'falareis', 'falarão']);
    assert.deepEqual(c.condicional, ['falaria', 'falarias', 'falaria', 'falaríamos', 'falaríeis', 'falariam']);
    assert.deepEqual(c.conjuntivo, ['fale', 'fales', 'fale', 'falemos', 'faleis', 'falem']);
    assert.equal(c.participio, 'falado');
    assert.equal(c.gerundio, 'falando');
  });

  test('-er: comer', () => {
    const c = conjugate('comer');
    assert.deepEqual(c.presente, ['como', 'comes', 'come', 'comemos', 'comeis', 'comem']);
    assert.deepEqual(c.perfeito, ['comi', 'comeste', 'comeu', 'comemos', 'comestes', 'comeram']);
    assert.deepEqual(c.imperfeito, ['comia', 'comias', 'comia', 'comíamos', 'comíeis', 'comiam']);
    assert.deepEqual(c.conjuntivo, ['coma', 'comas', 'coma', 'comamos', 'comais', 'comam']);
    assert.equal(c.participio, 'comido');
    assert.equal(c.gerundio, 'comendo');
  });

  test('-ir: partir', () => {
    const c = conjugate('partir');
    assert.deepEqual(c.presente, ['parto', 'partes', 'parte', 'partimos', 'partis', 'partem']);
    assert.deepEqual(c.perfeito, ['parti', 'partiste', 'partiu', 'partimos', 'partistes', 'partiram']);
    assert.deepEqual(c.futuro, ['partirei', 'partirás', 'partirá', 'partiremos', 'partireis', 'partirão']);
    assert.equal(c.participio, 'partido');
    assert.equal(c.gerundio, 'partindo');
  });

  test('во всех временах шесть лиц', () => {
    for (const verb of ['falar', 'comer', 'partir']) {
      const c = conjugate(verb);
      for (const { key } of TENSES) assert.equal(c[key].length, 6, `${verb} ${key}`);
    }
  });
});

describe('орфографические замены', () => {
  const cases = [
    ['ficar', 'perfeito', 0, 'fiquei'],
    ['ficar', 'conjuntivo', 3, 'fiquemos'],
    ['ficar', 'presente', 0, 'fico'],
    ['chegar', 'perfeito', 0, 'cheguei'],
    ['chegar', 'conjuntivo', 0, 'chegue'],
    ['começar', 'perfeito', 0, 'comecei'],
    ['começar', 'presente', 0, 'começo'],
    ['conhecer', 'presente', 0, 'conheço'],
    ['conhecer', 'presente', 1, 'conheces'],
    ['conhecer', 'conjuntivo', 0, 'conheça'],
    ['proteger', 'presente', 0, 'protejo'],
    ['dirigir', 'conjuntivo', 0, 'dirija'],
    ['distinguir', 'presente', 0, 'distingo'],
    ['distinguir', 'presente', 1, 'distingues'],
  ];
  for (const [verb, tense, person, expected] of cases) {
    test(`${verb}: ${tense}[${person}] = ${expected}`, () => {
      assert.equal(conjugate(verb)[tense][person], expected);
    });
  }
});

describe('неправильные формы', () => {
  test('частичные замены сохраняют остальные сгенерированные формы', () => {
    const c = conjugate('fazer', {
      presente: ['faço', 'fazes', 'faz', 'fazemos', 'fazeis', 'fazem'],
      participio: 'feito',
    });
    assert.equal(c.presente[0], 'faço');
    assert.equal(c.participio, 'feito');
    assert.deepEqual(c.imperfeito, ['fazia', 'fazias', 'fazia', 'fazíamos', 'fazíeis', 'faziam']);
    assert.equal(c.gerundio, 'fazendo');
  });

  test('инфинитив вне трёх групп (pôr) берёт только явные формы', () => {
    const presente = ['ponho', 'pões', 'põe', 'pomos', 'pondes', 'põem'];
    const conjuntivo = ['ponha', 'ponhas', 'ponha', 'ponhamos', 'ponhais', 'ponham'];
    const c = conjugate('pôr', { presente, conjuntivo, participio: 'posto', gerundio: 'pondo' });
    assert.deepEqual(c.presente, presente);
    assert.equal(c.perfeito, undefined);
    assert.equal(c.participio, 'posto');
    assert.deepEqual(c.imperativo, ['põe', 'ponha', 'ponhamos', 'ponde', 'ponham']);
  });
});

describe('повелительное наклонение', () => {
  test('утвердительное: tu и vós от presente без -s, остальные от conjuntivo', () => {
    assert.deepEqual(conjugate('falar').imperativo, ['fala', 'fale', 'falemos', 'falai', 'falem']);
    assert.deepEqual(conjugate('comer').imperativo, ['come', 'coma', 'comamos', 'comei', 'comam']);
    assert.deepEqual(conjugate('partir').imperativo, ['parte', 'parta', 'partamos', 'parti', 'partam']);
    assert.deepEqual(conjugate('ficar').imperativo, ['fica', 'fique', 'fiquemos', 'ficai', 'fiquem']);
  });

  test('отрицательное: não + conjuntivo', () => {
    assert.deepEqual(conjugate('falar').imperativoNegativo,
      ['não fales', 'não fale', 'não falemos', 'não faleis', 'não falem']);
  });

  test('явно заданное повелительное заменяет сгенерированное', () => {
    const imperativo = ['sê', 'seja', 'sejamos', 'sede', 'sejam'];
    assert.deepEqual(conjugate('ser', { imperativo }).imperativo, imperativo);
  });
});

describe('allForms', () => {
  test('включает времена, повелительное, причастие и герундий', () => {
    const forms = allForms(conjugate('falar'));
    for (const form of ['falo', 'falámos', 'falarão', 'falai', 'falado', 'falando']) {
      assert.ok(forms.includes(form), form);
    }
  });

  test('не включает отрицательное повелительное', () => {
    assert.ok(!allForms(conjugate('falar')).some((f) => f.startsWith('não ')));
  });
});
