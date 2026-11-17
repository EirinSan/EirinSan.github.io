// Tout le contenu du site vient des fichiers dans /data et /writeups.
// Pour modifier le site, pas besoin de toucher à ce fichier.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function load(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path} introuvable (${res.status})`);
  return res.json();
}

function frDate(d) {
  const date = new Date(d);
  return isNaN(date) ? esc(d) : date.toLocaleDateString("fr-FR");
}
const ordinal = (n) => (n === 1 ? "1er" : `${n}e`);

/* ---------- icônes pixel (16x16) ---------- */
const S = (body) => `<svg class="px" viewBox="0 0 16 16" aria-hidden="true">${body}</svg>`;
const ICONS = {
  folder: S(`<path d="M1 3h5l1 1h8v10H1z" fill="#b8901c"/><path d="M1 4h5l1 1h7v8H1z" fill="#f2d35b"/><path d="M1 7h14v7H1z" fill="#f8e28d"/><path d="M1 7h14v1H1z" fill="#fff4c4"/><path d="M1 14h14v1H1z" fill="#7a5d12"/>`),
  txt: S(`<path d="M3 1h7l3 3v11H3z" fill="#404040"/><path d="M4 2h6v3h2v9H4z" fill="#fff"/><path d="M10 2l2 3h-2z" fill="#c0c0c0"/><path d="M5 6h6v1H5zM5 8h6v1H5zM5 10h6v1H5zM5 12h4v1H5z" fill="#6a6a9a"/>`),
  people: S(`<path d="M9 3h4v4H9z" fill="#e3b58c"/><path d="M8 8h6v6H8z" fill="#2f5fa8"/><path d="M3 4h4v4H3z" fill="#f0c49c"/><path d="M3 3h4v1H3zM9 2h4v1H9z" fill="#3a2414"/><path d="M2 9h6v6H2z" fill="#c9548f"/><path d="M2 15h6v1H2z" fill="#6a1a44"/>`),
  trophy: S(`<path d="M4 1h8v6l-1 2H5L4 7z" fill="#e2b11f"/><path d="M5 2h2v5H5z" fill="#fde98a"/><path d="M2 2h2v4H2zM12 2h2v4h-2z" fill="#b8901c"/><path d="M3 3h1v2H3zM12 3h1v2h-1z" fill="#c3c3c3"/><path d="M7 9h2v3H7z" fill="#b8901c"/><path d="M4 12h8v3H4z" fill="#6a3c12"/><path d="M5 13h6v1H5z" fill="#e2b11f"/>`),
  mail: S(`<path d="M1 3h14v11H1z" fill="#404040"/><path d="M2 4h12v9H2z" fill="#fff"/><path d="M2 4h1v1h1v1h1v1h1v1h1v1h2V8h1V7h1V6h1V5h1V4h1v2h-1v1h-1v1h-1v1h-1v1H7V9H6V8H5V7H4V6H3V5H2z" fill="#808080"/>`),
  flag: S(`<path d="M3 1h1v14H3z" fill="#404040"/><path d="M2 14h4v1H2z" fill="#404040"/><path d="M4 2h9l-2 3 2 3H4z" fill="#c9548f"/><path d="M4 2h9l-1 1H4z" fill="#f08cbb"/><path d="M6 4h2v2H6z" fill="#fff"/>`),
  bin: S(`<path d="M3 3h10v1H3z" fill="#404040"/><path d="M6 1h4v2H6z" fill="#808080"/><path d="M4 4h8l-1 11H5z" fill="#9a9a9a"/><path d="M5 4h6l-1 10H6z" fill="#d8d8d8"/><path d="M7 5h1v8H7zM9 5h1v8H9z" fill="#9a9a9a"/>`),
  warn: S(`<path d="M7 1h2v1h1v2h1v2h1v2h1v2h1v2h1v3H1v-3h1v-2h1V8h1V6h1V4h1V2h1z" fill="#1a1a1a"/><path d="M7.5 2.5h1l5.5 11H2z" fill="#f5d21c"/><path d="M7 5h2v5H7zM7 11h2v2H7z" fill="#1a1a1a"/>`),
  mark: S(`<path d="M0 0h16v16H0z" fill="#6a1a44"/><path d="M2 4h4v8H2zM3 5v6h2V5z" fill="#fff" fill-rule="evenodd"/><path d="M8 6h1v1h1v1h1V7h1V6h1v1h-1v1h-1v1h1v1h1v1h1v1h-1v-1h-1v-1h-1v1H9v1H8v-1h1V9h1V8H9V7H8z" fill="#f08cbb"/>`),
};
const CHROME = {
  min: `<svg viewBox="0 0 8 7" aria-hidden="true"><path d="M1 5h6v2H1z"/></svg>`,
  max: `<svg viewBox="0 0 8 7" aria-hidden="true"><path d="M0 0h8v7H0zM1 2v4h6V2z" fill-rule="evenodd"/></svg>`,
  close: `<svg viewBox="0 0 8 7" aria-hidden="true"><path d="M0 0h2v1h1v1h2V1h1V0h2v1H7v1H6v1H5v1h1v1h1v1h1v1H6V6H5V5H3v1H2v1H0V6h1V5h1V4h1V3H2V2H1V1H0z"/></svg>`,
};
function paintIcons(root = document) {
  $$("i[data-icon]", root).forEach((el) => {
    el.outerHTML = ICONS[el.dataset.icon].replace('class="px"', `class="px${el.hasAttribute("data-sm") ? " sm" : ""}"`);
  });
}

/* ---------- gestion des fenêtres ---------- */
const desktop = $("#desktop");
const isPhone = () => matchMedia("(max-width: 700px)").matches;
let z = 10;
let cascade = 0;

function buildWindows() {
  $$(".win").forEach((w) => {
    w.id = `win-${w.dataset.id}`;
    w.hidden = true;
    w.classList.add("out");
    w.setAttribute("role", "dialog");
    w.setAttribute("aria-label", w.dataset.title);
    if (w.dataset.w) w.style.width = `${w.dataset.w}px`;
    const body = document.createElement("div");
    body.className = "winbody";
    while (w.firstChild) body.appendChild(w.firstChild);
    w.innerHTML = `
      <div class="titlebar">${ICONS[w.dataset.icon].replace('class="px"', 'class="px sm"')}
        <span class="ttext">${esc(w.dataset.title)}</span>
        <div class="tbtns">
          <button data-act="min" aria-label="Réduire">${CHROME.min}</button>
          <button data-act="max" aria-label="Agrandir">${CHROME.max}</button>
          <button data-act="close" aria-label="Fermer">${CHROME.close}</button>
        </div>
      </div>`;
    w.appendChild(body);
  });
}

function setTitle(w, title) {
  w.dataset.title = title;
  $(".ttext", w).textContent = title;
  w.setAttribute("aria-label", title);
  renderTasks();
}

function clamp(w) {
  if (isPhone() || w.classList.contains("max")) return;
  const W = desktop.clientWidth, H = desktop.clientHeight;
  const x = Math.min(Math.max(w.offsetLeft, 100 - w.offsetWidth), W - 100);
  const y = Math.min(Math.max(w.offsetTop, 0), H - 30);
  w.style.left = `${x}px`;
  w.style.top = `${y}px`;
}

function place(w) {
  if (w.dataset.placed) return;
  w.dataset.placed = "1";
  if (w.dataset.x) {
    w.style.left = `${w.dataset.x}px`;
    w.style.top = `${w.dataset.y}px`;
  } else {
    const n = cascade++ % 6;
    w.style.left = `${120 + n * 26}px`;
    w.style.top = `${24 + n * 26}px`;
  }
  // centre les fenêtres trop larges pour l'écran
  if (w.offsetLeft + w.offsetWidth > desktop.clientWidth) {
    w.style.left = `${Math.max(8, (desktop.clientWidth - w.offsetWidth) / 2)}px`;
  }
  clamp(w);
}

function topWindow() {
  return $$(".win").filter((w) => !w.hidden && !w.classList.contains("min"))
    .sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0))[0];
}

function focusWin(w) {
  $$(".win.active").forEach((x) => x !== w && x.classList.remove("active"));
  if (w) {
    w.classList.add("active");
    w.style.zIndex = ++z;
  }
  renderTasks();
}

function openWin(id) {
  const w = $(`#win-${id}`);
  if (!w) return;
  const wasHidden = w.hidden || w.classList.contains("min");
  w.hidden = false;
  w.classList.remove("min");
  place(w);
  if (wasHidden) {
    w.classList.remove("opening");
    void w.offsetWidth;
    w.classList.add("opening");
  }
  focusWin(w);
}

function closeWin(w) {
  w.hidden = true;
  w.classList.remove("active", "max");
  focusWin(topWindow());
}

function minimizeWin(w) {
  w.classList.add("min");
  w.classList.remove("active");
  focusWin(topWindow());
}

function renderTasks() {
  const open = $$(".win").filter((w) => !w.hidden);
  $("#tasks").innerHTML = open.map((w) => {
    const active = w.classList.contains("active") && !w.classList.contains("min");
    return `<button class="btn" data-task="${w.dataset.id}" aria-pressed="${active}">
      ${ICONS[w.dataset.icon].replace('class="px"', 'class="px sm"')}<span>${esc(w.dataset.title)}</span></button>`;
  }).join("");
}

function wireWindows() {
  // focus + déplacement par la barre de titre
  desktop.addEventListener("pointerdown", (e) => {
    const w = e.target.closest(".win");
    if (!w) return;
    if (!w.classList.contains("active")) focusWin(w);
    const bar = e.target.closest(".titlebar");
    if (!bar || e.target.closest("button") || isPhone() || w.classList.contains("max")) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ox = w.offsetLeft, oy = w.offsetTop;
    bar.setPointerCapture(e.pointerId);
    const move = (ev) => {
      w.style.left = `${ox + ev.clientX - sx}px`;
      w.style.top = `${oy + ev.clientY - sy}px`;
    };
    const up = () => {
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", up);
      bar.removeEventListener("pointercancel", up);
      clamp(w);
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", up);
    bar.addEventListener("pointercancel", up);
  });

  desktop.addEventListener("dblclick", (e) => {
    const bar = e.target.closest(".titlebar");
    if (bar && !e.target.closest("button") && !isPhone()) bar.closest(".win").classList.toggle("max");
  });

  document.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]");
    if (act) {
      const w = act.closest(".win");
      if (act.dataset.act === "close") closeWin(w);
      if (act.dataset.act === "min") minimizeWin(w);
      if (act.dataset.act === "max") w.classList.toggle("max");
      return;
    }
    const opener = e.target.closest("[data-open]");
    if (opener) {
      openWin(opener.dataset.open);
      toggleStart(false);
      return;
    }
    const task = e.target.closest("[data-task]");
    if (task) {
      const w = $(`#win-${task.dataset.task}`);
      if (w.classList.contains("min")) openWin(w.dataset.id);
      else if (w.classList.contains("active")) minimizeWin(w);
      else focusWin(w);
      return;
    }
    if (!e.target.closest("#startmenu, #start")) toggleStart(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("#startmenu").hidden) return toggleStart(false);
    const w = topWindow();
    if (w) closeWin(w);
  });

  window.addEventListener("resize", () => $$(".win").forEach((w) => !w.hidden && clamp(w)));
}

function toggleStart(force) {
  const menu = $("#startmenu");
  const show = force ?? menu.hidden;
  menu.hidden = !show;
  $("#start").setAttribute("aria-expanded", String(show));
}

function startClock() {
  const tick = () => {
    $("#clock").textContent = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };
  tick();
  setInterval(tick, 15000);
  $("#start").addEventListener("click", () => toggleStart());
}

/* ---------- contenu ---------- */
function link(url, label) {
  return `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
}

function rowKeys(container, onOpen) {
  container.addEventListener("click", (e) => {
    const row = e.target.closest("tr.row");
    if (row && !e.target.closest("a")) onOpen(row);
  });
  container.addEventListener("keydown", (e) => {
    const row = e.target.closest("tr.row");
    if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onOpen(row); }
  });
}

function renderAbout(team) {
  $("#about-text").innerHTML = `<h1>${esc(team.name)}</h1><p>${esc(team.tagline)}</p><p>${esc(team.about)}</p><p>Catégories : ${esc((team.categories || []).join(", "))}</p><p>-- la team</p>`;
}

function renderMembers(team) {
  const members = team.members || [];
  $("#member-list").innerHTML = `<table>
    <thead><tr><th>Pseudo</th><th>Rôle</th><th>Catégories</th><th>Liens</th></tr></thead>
    <tbody>${members.map((m) => `
      <tr>
        <td><span class="name-cell">${m.avatar
          ? `<img class="avatar" src="${esc(m.avatar)}" alt="">`
          : `<span class="avatar">${esc((m.name || "?")[0].toUpperCase())}</span>`}${esc(m.name)}</span></td>
        <td>${esc(m.role)}</td>
        <td>${esc((m.specialties || []).join(", "))}</td>
        <td>${Object.entries(m.links || {}).map(([k, u]) => link(u, k)).join(", ")}</td>
      </tr>`).join("")}</tbody></table>`;
  $("#member-count").textContent = `${members.length} membre(s)`;
}

function renderResults(team, ctfs) {
  const sorted = [...ctfs].sort((a, b) => new Date(b.date) - new Date(a.date));
  $("#results-list").innerHTML = sorted.length
    ? `<table><thead><tr><th>Date</th><th>CTF</th><th>Place</th><th>Points</th></tr></thead>
       <tbody>${sorted.map((c) => `<tr>
         <td>${frDate(c.date)}</td>
         <td>${c.url ? link(c.url, c.name) : esc(c.name)}</td>
         <td>${c.place ? ordinal(c.place) : "-"}${c.total ? ` / ${esc(c.total)}` : ""}</td>
         <td>${esc(c.points ?? "-")}</td></tr>`).join("")}</tbody></table>`
    : `<p class="empty">Aucun résultat pour le moment. Le premier CTF arrive bientôt.${team.ctftime ? ` En attendant, il y a notre page ${link(team.ctftime, "CTFtime")}.` : ""}</p>`;
  $("#results-count").textContent = `${ctfs.length} CTF joué(s)`;
  const best = ctfs.filter((c) => c.place).sort((a, b) => a.place - b.place)[0];
  $("#results-best").textContent = best ? `Meilleure place : ${ordinal(best.place)} à ${best.name}` : "";
}

function renderWriteups(writeups) {
  const select = $("#wu-filter");
  [...new Set(writeups.map((w) => w.category).filter(Boolean))].sort()
    .forEach((c) => select.insertAdjacentHTML("beforeend", `<option>${esc(c)}</option>`));

  const draw = () => {
    const cat = select.value;
    const items = [...writeups]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .filter((w) => !cat || w.category === cat);
    $("#wu-list").innerHTML = items.length
      ? `<table><thead><tr><th>Nom</th><th>Catégorie</th><th>CTF</th><th>Auteur</th><th>Date</th></tr></thead>
         <tbody>${items.map((w) => `<tr class="row" tabindex="0" data-id="${esc(w.id)}">
           <td><span class="name-cell">${ICONS.txt.replace('class="px"', 'class="px sm"')}${esc(w.id)}.md</span></td>
           <td>${esc(w.category)}</td><td>${esc(w.ctf)}</td><td>${esc(w.author)}</td><td>${frDate(w.date)}</td>
         </tr>`).join("")}</tbody></table>`
      : `<p class="empty">Ce dossier est vide. Les premiers writeups arrivent après notre prochain CTF.</p>`;
    $("#wu-count").textContent = `${items.length} objet(s)`;
  };
  select.addEventListener("change", draw);
  rowKeys($("#wu-list"), (row) => openReader(writeups.find((w) => w.id === row.dataset.id)));
  draw();
}

async function openReader(w) {
  const win = $("#win-reader");
  const body = $("#reader-body");
  if (!w) return;
  setTitle(win, `${w.id}.md - Lecteur`);
  $("#reader-cat").textContent = w.category || "";
  $("#reader-meta").textContent = `${w.ctf} · par ${w.author} · ${frDate(w.date)}`;
  body.innerHTML = `<p class="meta">Ouverture…</p>`;
  openWin("reader");
  body.scrollTop = 0;
  const res = await fetch(`writeups/${encodeURIComponent(w.id)}.md`, { cache: "no-cache" });
  const md = res.ok ? await res.text() : "_Le fichier de ce writeup est introuvable._";
  body.innerHTML = `<h1>${esc(w.title)}</h1>${DOMPurify.sanitize(marked.parse(md))}`;
  $$("a", body).forEach((a) => { a.target = "_blank"; a.rel = "noopener"; });
}

function renderContact(team) {
  $("#contact-text").innerHTML = `<p>${esc(team.join)}</p>`;
  const links = [];
  if (team.discord) links.push(["Discord", team.discord]);
  if (team.ctftime) links.push(["CTFtime", team.ctftime]);
  Object.entries(team.socials || {}).forEach(([k, u]) => {
    if (!links.some(([, x]) => x === u)) links.push([k, u]);
  });
  $("#contact-actions").innerHTML = links
    .map(([k, u]) => `<a class="btn" href="${esc(u)}" target="_blank" rel="noopener">${esc(k)}</a>`).join("")
    + `<button class="btn" data-act="close">Fermer</button>`;
  const ct = $("#ctftime-icon");
  if (team.ctftime) ct.href = team.ctftime; else ct.remove();
}

function renderBin(team) {
  $("#bin-list").innerHTML = `<table><thead><tr><th>Nom</th><th>Supprimé le</th></tr></thead>
    <tbody><tr><td><span class="name-cell">${ICONS.txt.replace('class="px"', 'class="px sm"')}premier_first_blood.txt</span></td><td>pas encore créé</td></tr></tbody></table>`;
  $("#bin-status").textContent = team.bugs || "";
}

/* ---------- démarrage ---------- */
(async () => {
  paintIcons();
  buildWindows();
  wireWindows();
  startClock();
  try {
    const [team, ctfs, writeups] = await Promise.all([
      load("data/team.json"), load("data/ctfs.json"), load("data/writeups.json"),
    ]);
    document.title = team.name || document.title;
    renderAbout(team);
    renderMembers(team);
    renderResults(team, ctfs);
    renderWriteups(writeups);
    renderContact(team);
    renderBin(team);

    openWin("about");
    if (!isPhone()) openWin("writeups");
    const id = new URLSearchParams(location.search).get("id");
    if (id) openReader(writeups.find((w) => w.id === id));
  } catch (err) {
    console.error(err);
    $("#win-shutdown .dialog div").innerHTML =
      `<p>Impossible de charger les données du site.</p><p>${esc(err.message)}. Vérifie que les fichiers JSON dans data/ sont valides.</p>`;
    setTitle($("#win-shutdown"), "Erreur");
    openWin("shutdown");
  }
})();
