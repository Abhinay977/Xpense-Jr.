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

/* ══════════════════════════════════════════
   CROSS-DEVICE TRANSFER — Export & Import
   localStorage is browser/device-specific.
   These functions let users move their
   account + data between devices via a JSON
   backup file.
══════════════════════════════════════════ */

/**
 * Export the given user's full account + records to a .json file download.
 * Call this on the SOURCE device (e.g. phone).
 */
function cwExportAccount(username) {
  const users = cwGetUsers();
  const user  = users[username];
  if (!user) return false;

  const backupData = {
    version:    2,
    app:        'xpensejr',
    exportedAt: new Date().toISOString(),
    user:       user,
    records:    cwLoadRecords(username)
  };

  const json = JSON.stringify(backupData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href     = url;
  a.download = `xpensejr_${username}_backup.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Import an account + records from a JSON backup file text.
 * Call this on the DESTINATION device (e.g. laptop).
 * Returns { ok, user, msg }.
 */
function cwImportAccount(jsonText) {
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch(e) {
    return { ok: false, msg: '❌ Invalid file. Please select a valid Xpense Jr. backup (.json).' };
  }

  /* Validate backup structure */
  if (data.app !== 'xpensejr' || !data.user || typeof data.records === 'undefined') {
    return { ok: false, msg: '❌ This file is not a valid Xpense Jr. backup.' };
  }

  const u   = data.user;
  const key = (u.username || '').trim().toLowerCase();
  if (!key || !u.name || !u.password) {
    return { ok: false, msg: '❌ Backup file is missing required user information.' };
  }

  /* Save user + records into this device's localStorage */
  const users = cwGetUsers();
  users[key] = u;
  localStorage.setItem(CW_USERS_KEY, JSON.stringify(users));
  cwSaveRecords(key, data.records || {});

  /* Auto-login as this user */
  localStorage.setItem(CW_SESSION_KEY, JSON.stringify({
    username: key,
    name:     u.name,
    age:      u.age,
    avatar:   u.avatar || '🎓',
    loginAt:  new Date().toISOString()
  }));

  return { ok: true, user: u };
}
