// Английский словарь: данные, поиск, вывод статей, тест на формы глаголов.
export { loadDictionary, search, suggest } from './dictionary.js';
export { renderEntry, renderHint, firstExample } from './render.js';
export { initQuiz } from './quiz.js';

export const DATA_URL = 'data/dict-en.json';
export const QUIZ_TITLE = 'Тест: формы глаголов';
export const SEARCH_PLACEHOLDER = 'Слово на английском или русском';
export const MODES = [['all', 'Все'], ['en', 'EN → RU'], ['ru', 'RU → EN']];

export const QUIZ_HTML = `
  <details class="quiz-settings">
    <summary>Настройки теста</summary>
    <fieldset>
      <legend>Формы</legend>
      <div class="quiz-tenses" id="quiz-forms"></div>
    </fieldset>
    <div class="cards-controls">
      <label>Глаголы
        <select id="quiz-set">
          <option value="irregular">Неправильные</option>
          <option value="regular">Правильные</option>
          <option value="all">Все</option>
        </select>
      </label>
      <label class="checkbox"><input type="checkbox" id="quiz-phrasal"> Фразовые глаголы</label>
    </div>
  </details>
  <div class="quiz-card" id="quiz-question" aria-live="polite"></div>
  <form class="quiz-form" id="quiz-form" autocomplete="off">
    <label for="quiz-input" class="visually-hidden">Форма глагола</label>
    <input id="quiz-input" type="text" lang="en" spellcheck="false" autocapitalize="off" autocorrect="off"
           placeholder="Введите форму глагола">
    <div class="card-actions">
      <button type="button" id="quiz-reveal">Показать ответ</button>
      <button type="submit" id="quiz-submit" class="known">Проверить</button>
    </div>
  </form>
  <p class="quiz-feedback" id="quiz-feedback" aria-live="polite"></p>
  <p class="cards-stats" id="quiz-score"></p>
  <button type="button" id="quiz-reset" class="link-button">Сбросить счёт</button>`;
