// paper_trail - auth
// localStorage-backed. NOT a real auth system - the client owns the store,
// anyone with devtools can see/change it. This is fine for the assignment
// (GitHub Pages can't run a backend) but i mention it in the writeup.

const USERS_KEY = "pt_users_v1";
const SESSION_KEY = "pt_session_v1";

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
  } catch { return {}; }
}
function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

function randSaltHex() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function pbkdf2Hex(password, saltHex, iters = 120000) {
  const enc = new TextEncoder();
  const saltBytes = new Uint8Array(saltHex.match(/.{2}/g).map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: iters, hash: "SHA-256" },
    key, 256
  );
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function registerUser(username, password) {
  username = (username || "").trim().toLowerCase();
  if (!/^[a-z0-9_\-]{3,24}$/.test(username)) {
    throw new Error("username: 3-24 chars, letters/digits/_- only");
  }
  if ((password || "").length < 6) throw new Error("password must be 6+ chars");

  const users = getUsers();
  if (users[username]) throw new Error("username is taken");

  const salt = randSaltHex();
  const hash = await pbkdf2Hex(password, salt);
  users[username] = { salt, hash, joined: Date.now() };
  saveUsers(users);
  return true;
}

async function loginUser(username, password) {
  username = (username || "").trim().toLowerCase();
  const users = getUsers();
  const rec = users[username];
  if (!rec) throw new Error("no such user");
  const hash = await pbkdf2Hex(password, rec.salt);
  if (hash !== rec.hash) throw new Error("wrong password");
  sessionSet(username);
  return true;
}

function sessionSet(username) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ u: username, t: Date.now() }));
}
function logoutUser() { localStorage.removeItem(SESSION_KEY); }
function currentUser() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    return s && s.u ? s.u : null;
  } catch { return null; }
}

window.PT = window.PT || {};
window.PT.auth = { registerUser, loginUser, logoutUser, currentUser };
