// Учётные записи (Supabase Auth) и прогресс каждого пользователя на сервере (таблица user_data).
//
// Как это работает:
// - программы по-прежнему пишут прогресс в localStorage, а этот модуль раз в 20 секунд, при
//   сворачивании и закрытии вкладки отправляет изменённые ключи на сервер;
// - при входе прогресс учётной записи загружается на устройство (см. planLogin), при выходе —
//   убирается с устройства, чтобы следующий пользователь его не видел;
// - без интернета приложение работает как обычно, изменения уйдут при следующей отправке.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { snapshot, dirty, fingerprint, planLogin, isSynced } from './sync.js';

const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
const TABLE = 'user_data';
const META_KEY = 'sync.meta'; // { user, pushed: { ключ: отпечаток } } — на устройстве, не синхронизируется
const BACKUP_KEY = 'sync.backup'; // прогресс устройства без учётной записи, если его заменил вход
const PUSH_EVERY = 20_000;

export const accountConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client = null;
let user = null;
let pushing = null;
let onChange = () => {};

function readMeta() {
  try {
    return { user: null, pushed: {}, ...JSON.parse(localStorage.getItem(META_KEY)) };
  } catch {
    return { user: null, pushed: {} };
  }
}

function writeMeta(meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // хранилище недоступно — синхронизация до перезагрузки
  }
}

function clearSyncedKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isSynced(key)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}

async function getClient() {
  if (client) return client;
  const { createClient } = await import(SUPABASE_JS);
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

async function fetchServer() {
  const { data, error } = await client.from(TABLE).select('key, value');
  if (error) throw error;
  return Object.fromEntries(data.map((row) => [row.key, row.value]));
}

function writeLocal(rows) {
  for (const [key, value] of Object.entries(rows)) localStorage.setItem(key, value);
}

// Отправить изменения устройства. Параллельные вызовы ждут уже идущую отправку.
export async function push() {
  if (!user || !client) return;
  if (pushing) return pushing;
  pushing = (async () => {
    const meta = readMeta();
    if (meta.user !== user.id) return;
    const current = snapshot(localStorage);
    const { upsert, remove } = dirty(current, meta.pushed);
    const rows = Object.entries(upsert).map(([key, value]) => ({ user_id: user.id, key, value, updated_at: new Date().toISOString() }));
    if (rows.length) {
      const { error } = await client.from(TABLE).upsert(rows);
      if (error) throw error;
    }
    if (remove.length) {
      const { error } = await client.from(TABLE).delete().in('key', remove);
      if (error) throw error;
    }
    for (const [key, value] of Object.entries(upsert)) meta.pushed[key] = fingerprint(value);
    for (const key of remove) delete meta.pushed[key];
    writeMeta(meta);
  })();
  try {
    await pushing;
  } finally {
    pushing = null;
  }
}

// Загрузить прогресс учётной записи на устройство. Возвращает, что было сделано.
async function adopt(newUser) {
  const meta = readMeta();
  const local = snapshot(localStorage);
  const server = await fetchServer();
  const plan = planLogin({ deviceUser: meta.user, user: newUser.id, local, serverKeys: Object.keys(server) });
  user = newUser;

  if (plan === 'merge') {
    writeMeta({ ...meta, user: newUser.id });
    await push(); // сначала изменения устройства — они новее
    const after = readMeta();
    const { upsert } = dirty(snapshot(localStorage), after.pushed);
    const pushed = { ...after.pushed };
    for (const [key, value] of Object.entries(server)) {
      if (key in upsert) continue; // не затираем то, что не успело уйти
      localStorage.setItem(key, value);
      pushed[key] = fingerprint(value);
    }
    writeMeta({ user: newUser.id, pushed });
  } else if (plan === 'upload') {
    writeMeta({ user: newUser.id, pushed: {} });
    await push();
  } else {
    if (!meta.user && Object.keys(local).length) localStorage.setItem(BACKUP_KEY, JSON.stringify(local));
    clearSyncedKeys();
    writeLocal(server);
    writeMeta({ user: newUser.id, pushed: Object.fromEntries(Object.entries(server).map(([k, v]) => [k, fingerprint(v)])) });
  }
  return plan;
}

// Запуск: восстановить сессию и подтянуть прогресс. Не дольше timeout — без сети приложение
// открывается сразу, синхронизация продолжится в фоне.
export async function initAccount({ timeout = 4000, onUserChange } = {}) {
  if (onUserChange) onChange = onUserChange;
  if (!accountConfigured()) return null;
  const work = (async () => {
    await getClient();
    const { data } = await client.auth.getSession();
    const sessionUser = data.session?.user ?? null;
    if (sessionUser) await adopt(sessionUser);
    else {
      const meta = readMeta();
      // Сессия закончилась, а на устройстве остались чужие данные — убрать их.
      if (meta.user) {
        clearSyncedKeys();
        writeMeta({ user: null, pushed: {} });
      }
    }
    client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') onChange({ event, user });
    });
    setInterval(() => push().catch(() => {}), PUSH_EVERY);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) push().catch(() => {});
    });
    window.addEventListener('pagehide', () => push().catch(() => {}));
    return sessionUser;
  })();
  work.catch(() => {});
  return Promise.race([work, new Promise((resolve) => setTimeout(() => resolve(user), timeout))]);
}

export const currentUser = () => user;

// Понятные сообщения об ошибках Supabase Auth.
export function authErrorText(error) {
  const m = String(error?.message ?? error);
  if (/Invalid login credentials/i.test(m)) return 'Неверный email или пароль.';
  if (/Email not confirmed/i.test(m)) return 'Email не подтверждён — откройте ссылку из письма.';
  if (/already registered|already exists/i.test(m)) return 'Такой email уже зарегистрирован — войдите.';
  if (/Password should be at least/i.test(m)) return 'Пароль слишком короткий — нужно не меньше 6 символов.';
  if (/rate limit|too many/i.test(m)) return 'Слишком много попыток — подождите немного.';
  if (/Signups not allowed/i.test(m)) return 'Регистрация закрыта.';
  if (/fetch|network/i.test(m)) return 'Нет связи с сервером. Проверьте интернет.';
  return m;
}

export async function signIn(email, password) {
  await getClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return adopt(data.user);
}

// Возвращает 'confirm', если нужно подтвердить email, иначе — план входа.
export async function signUp(email, password) {
  await getClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: location.origin + location.pathname },
  });
  if (error) throw error;
  if (!data.session) return 'confirm';
  return adopt(data.user);
}

export async function sendReset(email) {
  await getClient();
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  if (error) throw error;
}

export async function setPassword(password) {
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  try {
    await push();
  } catch {
    // Не получилось отправить (нет сети) — всё равно выходим, а неотправленное
    // сохраняем в резервной копии устройства.
    localStorage.setItem(BACKUP_KEY, JSON.stringify(snapshot(localStorage)));
  }
  await client.auth.signOut();
  user = null;
  clearSyncedKeys();
  writeMeta({ user: null, pushed: {} });
}
