// paper_trail - board storage
// posts live in localStorage. big caveat: each visitor sees only their own
// browser's posts (the board is not shared across people since there's no
// backend). it's a demo of the UI + stego; the writeup discusses this.

const POSTS_KEY = "pt_posts_v1";
const MAX_POST_BYTES = 4 * 1024 * 1024; // 4MB - localStorage quota is tight

function getPosts() {
  try { return JSON.parse(localStorage.getItem(POSTS_KEY) || "[]"); }
  catch { return []; }
}
function savePosts(list) { localStorage.setItem(POSTS_KEY, JSON.stringify(list)); }

// turn a Uint8Array into a data URL so we can store + show it
function bytesToDataURL(bytes, mime) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return `data:${mime || "application/octet-stream"};base64,` + btoa(bin);
}

function dataURLToBytes(url) {
  const comma = url.indexOf(",");
  const bin = atob(url.slice(comma + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function addPost(post) {
  const list = getPosts();
  const id = (crypto.randomUUID && crypto.randomUUID()) ||
             (Date.now() + "-" + Math.random().toString(36).slice(2));
  const full = { id, ts: Date.now(), ...post };
  list.unshift(full);
  if (post.dataUrl && post.dataUrl.length > MAX_POST_BYTES * 1.4) {
    throw new Error("post is too big (~4MB carrier limit in this demo)");
  }
  savePosts(list);
  return full;
}

function deletePost(id) {
  const list = getPosts().filter(p => p.id !== id);
  savePosts(list);
}

function getPost(id) {
  return getPosts().find(p => p.id === id) || null;
}

window.PT = window.PT || {};
window.PT.board = {
  getPosts, getPost, addPost, deletePost,
  bytesToDataURL, dataURLToBytes
};
