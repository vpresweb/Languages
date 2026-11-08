// Португальский словарь: данные, поиск, вывод статей, тест на спряжение.
export { loadDictionary, search, suggest } from './dictionary.js';
export { renderEntry, renderHint, firstExample } from './render.js';
export { initQuiz } from './quiz.js';

export const DATA_URL = 'data/dict-pt.json';
export const QUIZ_TITLE = 'Тест: спряжение';
export const SEARCH_PLACEHOLDER = 'Слово на португальском или русском';
export const MODES = [['all', 'Все'], ['pt', 'PT → RU'], ['ru', 'RU → PT']];

export const QUIZ_HTML = `
  <details class="quiz-settings">
    <summary>Настройки теста</summary>
    <fieldset>
      <legend>Времена</legend>
      <div class="quiz-tenses" id="quiz-tenses"></div>
    </fieldset>
    <div class="cards-controls">
      <label>Глаголы
        <select id="quiz-set">
          <option value="all">Все</option>
          <option value="irregular">Неправильные</option>
          <option value="regular">Правильные</option>
        </select>
      </label>
      <label class="checkbox"><input type="checkbox" id="quiz-vos"> Спрашивать форму vós</label>
    </div>
  </details>
  <div class="quiz-card" id="quiz-question" aria-live="polite"></div>
  <form class="quiz-form" id="quiz-form" autocomplete="off">
    <label for="quiz-input" class="visually-hidden">Форма глагола</label>
    <input id="quiz-input" type="text" lang="pt" spellcheck="false" autocapitalize="off"
           placeholder="Введите форму глагола">
    <div class="quiz-accents" id="quiz-accents" aria-label="Буквы с диакритикой"></div>
    <div class="card-actions">
      <button type="button" id="quiz-reveal">Показать ответ</button>
      <button type="submit" id="quiz-submit" class="known">Проверить</button>
    </div>
  </form>
  <p class="quiz-feedback" id="quiz-feedback" aria-live="polite"></p>
  <p class="cards-stats" id="quiz-score"></p>
  <button type="button" id="quiz-reset" class="link-button">Сбросить счёт</button>`;
