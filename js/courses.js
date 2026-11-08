// Раздел «Курсы»: курсы по методу Фейнмана открываются внутри приложения с их сайтов на
// vpresweb.github.io — так всё, что меняется в репозиториях курсов, сразу видно и здесь,
// а прогресс курсов (localStorage того же сайта) сохраняется.
import { escapeHtml } from './words/data.js';

const BASE = 'https://vpresweb.github.io/';

export const COURSES = {
  en: [
    { id: 'a1', level: 'A1', title: 'Британский английский A1', path: 'English_A1/', text: '12 недель: от алфавита и звуков до финального экзамена A1.' },
    { id: 'a2', level: 'A2', title: 'Британский английский A2', path: 'English_A2/', text: '12 недель: Present Perfect, условные предложения, пассив, косвенная речь, подготовка к Cambridge A2 Key.' },
    { id: 'b1', level: 'B1', title: 'Британский английский B1', path: 'English_B1/', text: '12 недель: повествовательные времена, третий тип условий, фразовые глаголы, подготовка к Cambridge B1 Preliminary.' },
    { id: 'b2', level: 'B2', title: 'Британский английский B2', path: 'English_B2/', text: '12 недель: смешанные условия, инверсия, причастные обороты, словообразование, подготовка к Cambridge B2 First.' },
  ],
  pt: [
    { id: 'a1', level: 'A1', title: 'Европейский португальский A1', path: 'Portuguese-by-Feinman/', text: '12 недель от алфавита до экзамена CIPLE (A1).' },
    { id: 'a2', level: 'A2', title: 'Европейский португальский A2', path: 'Portuguese-by-Feinman-A2/', text: '12 недель: MQP, Conjuntivo, Passiva, подготовка к CIPLE.' },
  ],
};

export function courseUrl(course) {
  return BASE + course.path;
}

// root — секция раздела; navigate(id) — открыть курс (или список, если id пустой).
export function createCourses(root, { navigate }) {
  const $ = (id) => root.querySelector(`#${id}`);
  const list = $('course-list');
  const viewer = $('course-viewer');
  const frame = $('course-frame');
  let lang = 'en';

  function renderList() {
    list.innerHTML = COURSES[lang]
      .map((c) => `
        <li>
          <a class="course-card" href="#/${lang}/courses/${c.id}" data-course="${c.id}">
            <span class="course-level">${c.level}</span>
            <span class="course-title">${escapeHtml(c.title)}</span>
            <span class="course-text">${escapeHtml(c.text)}</span>
          </a>
        </li>`)
      .join('');
  }

  // id — курс или '' для списка.
  function show(id) {
    const course = COURSES[lang].find((c) => c.id === id);
    document.body.classList.toggle('wide', Boolean(course));
    list.hidden = Boolean(course);
    $('courses-intro').hidden = Boolean(course);
    viewer.hidden = !course;
    if (!course) {
      // Курс выгружается, чтобы не звучал и не тратил память в фоне.
      if (frame.getAttribute('src')) frame.removeAttribute('src');
      renderList();
      return;
    }
    $('course-title').textContent = course.title;
    $('course-open').href = courseUrl(course);
    if (frame.getAttribute('src') !== courseUrl(course)) frame.src = courseUrl(course);
  }

  function setLang(code) {
    lang = COURSES[code] ? code : 'en';
    renderList();
  }

  $('course-back').addEventListener('click', (event) => {
    event.preventDefault();
    navigate('');
  });

  return { setLang, show };
}
