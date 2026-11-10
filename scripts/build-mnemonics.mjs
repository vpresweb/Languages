// Собирает data/mnemonics-<язык>.json из data/mnemonics-<язык>-*.tsv.
// Строка TSV: слово <TAB> часть речи <TAB> ассоциация. Проверяет, что слово есть в
// data/words-<язык>.json, и что нет дублей. Запуск: node scripts/build-mnemonics.mjs pt
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const lang = process.argv[2] || 'pt';
const words = JSON.parse(readFileSync(`data/words-${lang}.json`, 'utf8'));
const known = new Set(words.map((e) => `${e.word}|${e.pos}`));
const out = {};
const problems = [];

for (const file of readdirSync('data').filter((n) => new RegExp(`^mnemonics-${lang}-\\d+\\.tsv$`).test(n)).sort()) {
  readFileSync(`data/${file}`, 'utf8').split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const [word, pos, text] = line.split('\t');
    const key = `${word}|${pos}`;
    if (!text?.trim()) problems.push(`${file}:${i + 1}: нет текста`);
    else if (!known.has(key)) problems.push(`${file}:${i + 1}: слова «${key}» нет в словаре`);
    else if (out[key]) problems.push(`${file}:${i + 1}: «${key}» уже есть`);
    else out[key] = text.trim();
  });
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
writeFileSync(`data/mnemonics-${lang}.json`, JSON.stringify(out));
console.log(`data/mnemonics-${lang}.json: ${Object.keys(out).length} ассоциаций`);
