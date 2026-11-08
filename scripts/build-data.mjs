// Собирает данные приложения из репозиториев словарей:
//   data/dict-en.json, data/dict-pt.json — полные словари для поиска (копия);
//   data/words-en.json, data/words-pt.json — основная часть (без расширенного словаря из Викисловаря)
//   для раздела «Слова», порядок — по частоте.
//
// Запуск: node scripts/build-data.mjs [путь к Dictionary_English] [путь к Dicionario_Portugues]
// По умолчанию словари ищутся рядом с этим репозиторием.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [enDir = join(root, '..', 'Dictionary_English'), ptDir = join(root, '..', 'Dicionario_Portugues')] =
  process.argv.slice(2);

const MAX_TRANSLATIONS = 3;

// Слово для раздела «Слова»: слово, часть речи, род, до трёх переводов, один пример.
export function compact(entry, exampleKey) {
  const out = { word: entry.word, pos: entry.pos, translations: entry.translations.slice(0, MAX_TRANSLATIONS) };
  if (entry.gender) out.gender = entry.gender;
  const example = entry.examples?.[0];
  if (example?.[exampleKey] && example.ru) out.example = { text: example[exampleKey], ru: example.ru };
  return out;
}

async function build(dir, lang) {
  const raw = await readFile(join(dir, 'data', 'dictionary.json'), 'utf8');
  const entries = JSON.parse(raw);
  await writeFile(join(root, 'data', `dict-${lang}.json`), raw);

  const seen = new Set();
  const words = [];
  for (const entry of entries) {
    if (entry.extra || !entry.translations?.length) continue;
    const id = `${entry.word}|${entry.pos}`;
    if (seen.has(id)) continue;
    seen.add(id);
    words.push(compact(entry, lang));
  }
  await writeFile(join(root, 'data', `words-${lang}.json`), JSON.stringify(words));
  console.log(`${lang}: словарь ${entries.length} статей, для запоминания ${words.length} слов`);
}

await mkdir(join(root, 'data'), { recursive: true });
await build(enDir, 'en');
await build(ptDir, 'pt');
