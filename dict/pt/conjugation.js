// Спряжение глаголов (европейский вариант португальского).
// Правильные глаголы спрягаются по окончанию инфинитива (-ar, -er, -ir),
// неправильные формы задаются в словаре полем "conjugation" и заменяют сгенерированные.

export const PERSONS = ['eu', 'tu', 'ele/ela/você', 'nós', 'vós', 'eles/elas/vocês'];
export const IMPERATIVE_PERSONS = ['tu', 'você', 'nós', 'vós', 'vocês'];

export const TENSES = [
  { key: 'presente', label: 'Presente', ru: 'настоящее время' },
  { key: 'perfeito', label: 'Pretérito perfeito', ru: 'прошедшее завершённое' },
  { key: 'imperfeito', label: 'Pretérito imperfeito', ru: 'прошедшее незавершённое' },
  { key: 'futuro', label: 'Futuro', ru: 'будущее время' },
  { key: 'condicional', label: 'Condicional', ru: 'условное наклонение' },
  { key: 'conjuntivo', label: 'Presente do conjuntivo', ru: 'сослагательное наклонение' },
];

export const IMPERATIVES = [
  { key: 'imperativo', label: 'Imperativo afirmativo', ru: 'повелительное, утвердительное' },
  { key: 'imperativoNegativo', label: 'Imperativo negativo', ru: 'повелительное, отрицательное' },
];

const ER_IR_IMPERFEITO = ['ia', 'ias', 'ia', 'íamos', 'íeis', 'iam'];
const ER_IR_CONJUNTIVO = ['a', 'as', 'a', 'amos', 'ais', 'am'];

const ENDINGS = {
  ar: {
    presente: ['o', 'as', 'a', 'amos', 'ais', 'am'],
    perfeito: ['ei', 'aste', 'ou', 'ámos', 'astes', 'aram'],
    imperfeito: ['ava', 'avas', 'ava', 'ávamos', 'áveis', 'avam'],
    conjuntivo: ['e', 'es', 'e', 'emos', 'eis', 'em'],
    participio: 'ado',
    gerundio: 'ando',
  },
  er: {
    presente: ['o', 'es', 'e', 'emos', 'eis', 'em'],
    perfeito: ['i', 'este', 'eu', 'emos', 'estes', 'eram'],
    imperfeito: ER_IR_IMPERFEITO,
    conjuntivo: ER_IR_CONJUNTIVO,
    participio: 'ido',
    gerundio: 'endo',
  },
  ir: {
    presente: ['o', 'es', 'e', 'imos', 'is', 'em'],
    perfeito: ['i', 'iste', 'iu', 'imos', 'istes', 'iram'],
    imperfeito: ER_IR_IMPERFEITO,
    conjuntivo: ER_IR_CONJUNTIVO,
    participio: 'ido',
    gerundio: 'indo',
  },
};

// Будущее и условное образуются от инфинитива целиком.
const FUTURO = ['ei', 'ás', 'á', 'emos', 'eis', 'ão'];
const CONDICIONAL = ['ia', 'ias', 'ia', 'íamos', 'íeis', 'iam'];

// Орфографические замены на стыке основы и окончания:
// ficar → fiquei, chegar → cheguei, começar → comecei,
// conhecer → conheço, proteger → protejo, erguer → ergo.
function join(stem, ending, group) {
  const first = ending[0];
  if (group === 'ar' && first === 'e') {
    if (stem.endsWith('c')) return stem.slice(0, -1) + 'qu' + ending;
    if (stem.endsWith('ç')) return stem.slice(0, -1) + 'c' + ending;
    if (stem.endsWith('g')) return stem + 'u' + ending;
  }
  if (group !== 'ar' && (first === 'a' || first === 'o')) {
    if (stem.endsWith('gu')) return stem.slice(0, -2) + 'g' + ending;
    if (stem.endsWith('c')) return stem.slice(0, -1) + 'ç' + ending;
    if (stem.endsWith('g')) return stem.slice(0, -1) + 'j' + ending;
  }
  return stem + ending;
}

// Повелительное: tu и vós — форма настоящего времени без конечного -s,
// você, nós, vocês — формы conjuntivo. Отрицательное — não + conjuntivo.
function imperativeFrom(presente, conjuntivo) {
  return [
    presente[1].replace(/s$/, ''),
    conjuntivo[2],
    conjuntivo[3],
    presente[4].replace(/s$/, ''),
    conjuntivo[5],
  ];
}

function negativeImperativeFrom(conjuntivo) {
  return [1, 2, 3, 4, 5].map((i) => `não ${conjuntivo[i]}`);
}

// Возвращает { presente: [6 форм], ..., imperativo: [5], imperativoNegativo: [5], participio, gerundio }.
// Для инфинитивов вне трёх групп (pôr) берутся только явно заданные формы.
export function conjugate(infinitive, overrides = {}) {
  const group = infinitive.slice(-2);
  const regular = ENDINGS[group];
  const stem = infinitive.slice(0, -2);
  const result = {};

  for (const { key } of TENSES) {
    if (overrides[key]) result[key] = overrides[key];
    else if (!regular) continue;
    else if (key === 'futuro') result[key] = FUTURO.map((e) => infinitive + e);
    else if (key === 'condicional') result[key] = CONDICIONAL.map((e) => infinitive + e);
    else result[key] = regular[key].map((e) => join(stem, e, group));
  }

  if (overrides.imperativo) result.imperativo = overrides.imperativo;
  else if (result.presente && result.conjuntivo) result.imperativo = imperativeFrom(result.presente, result.conjuntivo);
  if (result.conjuntivo) result.imperativoNegativo = negativeImperativeFrom(result.conjuntivo);

  result.participio = overrides.participio ?? (regular ? stem + regular.participio : undefined);
  result.gerundio = overrides.gerundio ?? (regular ? stem + regular.gerundio : undefined);
  return result;
}

// Неправильный — если в словаре задана хотя бы одна форма времени или повелительного.
// Особое причастие (ganhar → ganho) само по себе глагол неправильным не делает.
export function isIrregular(overrides = {}) {
  return [...TENSES.map((t) => t.key), 'imperativo'].some((key) => key in overrides);
}

// Все формы глагола одним списком — для поиска по формам (fiz → fazer).
// Отрицательное повелительное не включаем: его формы совпадают с conjuntivo.
export function allForms(conjugation) {
  const forms = TENSES.flatMap(({ key }) => conjugation[key] ?? []);
  if (conjugation.imperativo) forms.push(...conjugation.imperativo);
  if (conjugation.participio) forms.push(conjugation.participio);
  if (conjugation.gerundio) forms.push(conjugation.gerundio);
  return forms;
}
