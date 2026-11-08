// Кнопка «Войти» в шапке и окно входа, регистрации, восстановления и смены пароля.
import {
  accountConfigured, currentUser, signIn, signUp, sendReset, setPassword, signOut, authErrorText,
} from './account.js';

const $ = (id) => document.getElementById(id);

const MODES = {
  login: { title: 'Вход', submit: 'Войти', password: true, email: true },
  signup: { title: 'Регистрация', submit: 'Зарегистрироваться', password: true, email: true },
  reset: { title: 'Восстановление пароля', submit: 'Прислать ссылку', password: false, email: true },
  newpass: { title: 'Новый пароль', submit: 'Сохранить пароль', password: true, email: false },
};

export function initAccountUi() {
  const button = $('account-button');
  const dialog = $('account-dialog');
  const form = $('account-form');
  const email = $('account-email');
  const password = $('account-password');
  const status = $('account-status');
  const submit = $('account-submit');
  let mode = 'login';

  if (!accountConfigured()) {
    button.hidden = true;
    return { refresh: () => {}, openNewPassword: () => {} };
  }
  button.hidden = false;

  function refresh() {
    const user = currentUser();
    button.textContent = user ? user.email.split('@')[0] : 'Войти';
    button.title = user ? `Вы вошли как ${user.email}` : 'Войти или зарегистрироваться';
  }

  function setMode(next) {
    mode = next;
    const m = MODES[mode];
    $('account-title').textContent = m.title;
    submit.textContent = m.submit;
    $('account-email-row').hidden = !m.email;
    $('account-password-row').hidden = !m.password;
    password.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    $('account-links').hidden = mode === 'newpass';
    $('account-to-login').hidden = mode === 'login';
    $('account-to-signup').hidden = mode === 'signup';
    $('account-to-reset').hidden = mode === 'reset';
    status.textContent = '';
  }

  function openForm(next) {
    setMode(next);
    $('account-forms').hidden = false;
    $('account-profile').hidden = true;
    dialog.showModal();
    (MODES[next].email ? email : password).focus();
  }

  function openProfile() {
    $('account-title').textContent = 'Учётная запись';
    $('account-who').textContent = currentUser().email;
    $('account-forms').hidden = true;
    $('account-profile').hidden = false;
    status.textContent = '';
    dialog.showModal();
  }

  button.addEventListener('click', () => (currentUser() ? openProfile() : openForm('login')));
  $('account-close').addEventListener('click', () => dialog.close());
  $('account-to-login').addEventListener('click', () => setMode('login'));
  $('account-to-signup').addEventListener('click', () => setMode('signup'));
  $('account-to-reset').addEventListener('click', () => setMode('reset'));

  const done = (text, reload = true) => {
    status.textContent = text;
    // Перезагрузка: все разделы и курсы перечитывают прогресс этого пользователя.
    if (reload) setTimeout(() => location.reload(), 700);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    status.textContent = 'Подождите…';
    try {
      if (mode === 'login') {
        const plan = await signIn(email.value.trim(), password.value);
        done(plan === 'upload' ? 'Готово. Прогресс с этого устройства сохранён в вашей учётной записи.' : 'Готово, загружаем ваш прогресс…');
      } else if (mode === 'signup') {
        const result = await signUp(email.value.trim(), password.value);
        if (result === 'confirm') {
          done('Мы отправили письмо — откройте ссылку из него, чтобы подтвердить email, затем войдите.', false);
        } else {
          done(result === 'upload' ? 'Учётная запись создана, прогресс с этого устройства сохранён в ней.' : 'Учётная запись создана.');
        }
      } else if (mode === 'reset') {
        await sendReset(email.value.trim());
        done('Если такой email зарегистрирован, на него придёт ссылка для смены пароля.', false);
      } else {
        await setPassword(password.value);
        done('Пароль изменён.');
      }
    } catch (error) {
      status.textContent = authErrorText(error);
    } finally {
      submit.disabled = false;
    }
  });

  $('account-logout').addEventListener('click', async () => {
    $('account-logout').disabled = true;
    status.textContent = 'Сохраняем прогресс и выходим…';
    try {
      await signOut();
      done('Вы вышли. Прогресс сохранён в учётной записи.');
    } catch (error) {
      status.textContent = authErrorText(error);
      $('account-logout').disabled = false;
    }
  });

  refresh();
  return { refresh, openNewPassword: () => openForm('newpass') };
}
