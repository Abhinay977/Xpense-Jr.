/* ══════════════════════════════════════════
   CREDWISE KIDS — auth.js
   Shared Authentication & Data Persistence
   Works with localStorage (client-side)
══════════════════════════════════════════ */

const CW_USERS_KEY   = 'cw_users';
const CW_SESSION_KEY = 'cw_session';

/* ── Get all registered users ── */
function cwGetUsers() {
  try { return JSON.parse(localStorage.getItem(CW_USERS_KEY) || '{}'); }
  catch(e) { return {}; }
}

/* ── Get current active session ── */
function cwGetSession() {
  try { return JSON.parse(localStorage.getItem(CW_SESSION_KEY)); }
  catch(e) { return null; }
}

/* ── Login: validate credentials, set session ── */
function cwLogin(username, password) {
  if (!username || !password) return { ok: false, msg: 'Please fill in all fields.' };
  const users = cwGetUsers();
  const key   = username.trim().toLowerCase();
  const user  = users[key];
  if (!user)              return { ok: false, msg: '❌ User not found. Please register first.' };
  if (user.password !== password) return { ok: false, msg: '❌ Incorrect password. Try again.' };
  localStorage.setItem(CW_SESSION_KEY, JSON.stringify({
    username: key,
    name:     user.name,
    age:      user.age,
    avatar:   user.avatar || '🎓',
    loginAt:  new Date().toISOString()
  }));
  return { ok: true, user };
}

/* ── Register: create new user account ── */
function cwRegister(name, age, username, password, confirmPassword, avatar) {
  if (!name || !age || !username || !password) {
    return { ok: false, msg: '❌ All fields are required.' };
  }
  if (name.trim().length < 2) {
    return { ok: false, msg: '❌ Name must be at least 2 characters.' };
  }
  const ageNum = parseInt(age);
  if (isNaN(ageNum) || ageNum < 5 || ageNum > 18) {
    return { ok: false, msg: '❌ Age must be between 5 and 18.' };
  }
  if (username.trim().length < 3) {
    return { ok: false, msg: '❌ Username must be at least 3 characters.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
    return { ok: false, msg: '❌ Username: only letters, numbers & underscores.' };
  }
  if (password.length < 4) {
    return { ok: false, msg: '❌ Password must be at least 4 characters.' };
  }
  if (password !== confirmPassword) {
    return { ok: false, msg: '❌ Passwords do not match.' };
  }

  const users = cwGetUsers();
  const key   = username.trim().toLowerCase();
  if (users[key]) {
    return { ok: false, msg: '❌ Username already taken. Choose another.' };
  }

  const newUser = {
    name:      name.trim(),
    age:       ageNum,
    username:  key,
    password:  password,
    avatar:    avatar || '🎓',
    createdAt: new Date().toISOString()
  };

  users[key] = newUser;
  localStorage.setItem(CW_USERS_KEY, JSON.stringify(users));

  /* Auto login after registration */
  localStorage.setItem(CW_SESSION_KEY, JSON.stringify({
    username: key,
    name:     newUser.name,
    age:      newUser.age,
    avatar:   newUser.avatar,
    loginAt:  new Date().toISOString()
  }));

  return { ok: true, user: newUser };
}

/* ── Logout: clear session and redirect ── */
function cwLogout() {
  localStorage.removeItem(CW_SESSION_KEY);
  window.location.href = 'login.html';
}

/* ── Require auth: redirect to login if no session ── */
function cwRequireAuth() {
  const session = cwGetSession();
  if (!session) {
    window.location.replace('login.html');
    return null;
  }
  return session;
}

/* ── Save a user's financial records to localStorage ── */
function cwSaveRecords(username, records) {
  try {
    localStorage.setItem(`cw_rec_${username}`, JSON.stringify(records));
    return true;
  } catch(e) {
    console.error('Failed to save records:', e);
    return false;
  }
}

/* ── Load a user's financial records from localStorage ── */
function cwLoadRecords(username) {
  try {
    return JSON.parse(localStorage.getItem(`cw_rec_${username}`) || '{}');
  } catch(e) {
    return {};
  }
}

/* ── Get all registered usernames (for admin/debug) ── */
function cwListUsers() {
  const users = cwGetUsers();
  return Object.values(users).map(u => ({
    username: u.username,
    name:     u.name,
    age:      u.age,
    avatar:   u.avatar,
    joinedAt: u.createdAt
  }));
}

