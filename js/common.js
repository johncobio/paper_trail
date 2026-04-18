// shared little bits

function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return [...(root || document).querySelectorAll(sel)]; }

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function humanBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(2) + " MB";
}

function humanDate(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// draw the nav bar. username is shown if logged in.
function renderNav(active) {
  const user = window.PT.auth.currentUser();
  const nav = $("#nav");
  if (!nav) return;
  const links = [
    { href: "index.html", label: "board", key: "board" },
    { href: "submit.html", label: "submit", key: "submit" },
    { href: "extract.html", label: "extract", key: "extract" },
    { href: "about.html", label: "about", key: "about" }
  ];
  const parts = links.map(l =>
    `<a class="${active === l.key ? "on" : ""}" href="${l.href}">${l.label}</a>`
  );
  if (user) {
    parts.push(`<span class="who">[ ${escapeHTML(user)} ]</span>`);
    parts.push(`<a href="#" id="logout">logout</a>`);
  } else {
    parts.push(`<a class="${active === "login" ? "on" : ""}" href="login.html">login</a>`);
    parts.push(`<a class="${active === "register" ? "on" : ""}" href="register.html">register</a>`);
  }
  nav.innerHTML = parts.join(" &middot; ");
  const lo = $("#logout");
  if (lo) lo.onclick = (e) => { e.preventDefault(); window.PT.auth.logoutUser(); location.reload(); };
}

// let users pick a file and get a Uint8Array back
function readFileBytes(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(new Uint8Array(r.result));
    r.onerror = () => rej(r.error);
    r.readAsArrayBuffer(file);
  });
}

// trigger a download of a Uint8Array
function downloadBytes(bytes, filename, mime) {
  const blob = new Blob([bytes], { type: mime || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}

window.PT = window.PT || {};
window.PT.util = { $, $$, escapeHTML, humanBytes, humanDate, renderNav, readFileBytes, downloadBytes };
