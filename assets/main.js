// Tout le contenu du site vient des fichiers dans /data.
// Pour modifier le site, pas besoin de toucher à ce fichier.

const $ = (sel) => document.querySelector(sel);

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function load(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

function fmtDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date)) return esc(d);
  return date.toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "numeric" });
}

function ordinal(n) {
  return n === 1 ? "1er" : `${n}e`;
}

function fillTeam(team) {
  document.querySelectorAll("[data-team]").forEach((el) => {
    const v = team[el.dataset.team];
    if (v) el.textContent = v;
  });
  if (team.name) {
    document.title = document.title === "Writeup" ? document.title : team.name;
  }
  $("#year").textContent = new Date().getFullYear();
}

function renderHome(team, ctfs, writeups) {
  const discord = $("#discord-link");
  if (team.discord) discord.href = team.discord; else discord.remove();
  const ctftime = $("#ctftime-link");
  if (team.ctftime) ctftime.href = team.ctftime; else ctftime.remove();

  $("#categories").innerHTML = (team.categories || [])
    .map((c) => `<span class="tag">${esc(c)}</span>`).join("");

  // members
  $("#member-list").innerHTML = (team.members || []).map((m) => {
    const avatar = m.avatar
      ? `<img class="avatar" src="${esc(m.avatar)}" alt="">`
      : `<div class="avatar">${esc((m.name || "?")[0].toUpperCase())}</div>`;
    const links = Object.entries(m.links || {})
      .map(([k, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(k)}</a>`).join("");
    return `
      <div class="card">
        <div class="member-head">${avatar}
          <div><div class="member-name">${esc(m.name)}</div><div class="member-role">${esc(m.role)}</div></div>
        </div>
        <div class="tags">${(m.specialties || []).map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div>
        ${links ? `<div class="links">${links}</div>` : ""}
      </div>`;
  }).join("");

  // results
  const sorted = [...ctfs].sort((a, b) => new Date(b.date) - new Date(a.date));
  $("#result-list").innerHTML = sorted.map((c) => `
    <tr>
      <td>${fmtDate(c.date)}</td>
      <td>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.name)}</a>` : esc(c.name)}</td>
      <td class="place ${c.place <= 3 ? "podium" : ""}">${c.place ? ordinal(c.place) : "-"}${c.total ? ` / ${c.total}` : ""}</td>
      <td>${esc(c.points ?? "-")}</td>
    </tr>`).join("") || `<tr><td colspan="4" class="muted">Aucun CTF pour l'instant.</td></tr>`;

  // stats
  $("#stat-ctfs").textContent = ctfs.length;
  $("#stat-members").textContent = (team.members || []).length;
  $("#stat-writeups").textContent = writeups.length;
  const best = ctfs.filter((c) => c.place).sort((a, b) => a.place - b.place)[0];
  $("#stat-best").textContent = best ? ordinal(best.place) : "-";

  // writeups + filters
  const cats = ["tout", ...new Set(writeups.map((w) => w.category).filter(Boolean))];
  let current = "tout";
  const drawList = () => {
    const items = [...writeups]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .filter((w) => current === "tout" || w.category === current);
    $("#writeup-list").innerHTML = items.map((w) => `
      <a class="writeup-item" href="writeup.html?id=${encodeURIComponent(w.id)}">
        <span><span class="title">${esc(w.title)}</span> <span class="meta">· ${esc(w.ctf)}</span></span>
        <span class="meta">${esc(w.category)} · ${esc(w.author)} · ${fmtDate(w.date)}</span>
      </a>`).join("") || `<p class="muted">Aucun writeup pour l'instant.</p>`;
  };
  $("#writeup-filters").innerHTML = cats
    .map((c) => `<button data-cat="${esc(c)}" class="${c === current ? "active" : ""}">${esc(c)}</button>`).join("");
  $("#writeup-filters").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    current = btn.dataset.cat;
    document.querySelectorAll("#writeup-filters button")
      .forEach((b) => b.classList.toggle("active", b === btn));
    drawList();
  });
  drawList();

  // socials
  $("#socials").innerHTML = Object.entries(team.socials || {})
    .map(([k, url]) => `<a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener">${esc(k)}</a>`).join("");
}

async function renderWriteup(writeups) {
  const el = $("#writeup");
  const id = new URLSearchParams(location.search).get("id");
  const w = writeups.find((x) => x.id === id);
  if (!w) {
    el.innerHTML = `<h1>404</h1><p class="muted">Writeup introuvable. <a href="index.html#writeups">Retour</a></p>`;
    return;
  }
  document.title = `${w.title} · ${w.ctf}`;
  const res = await fetch(`writeups/${encodeURIComponent(w.id)}.md`, { cache: "no-cache" });
  const md = res.ok ? await res.text() : "_Fichier du writeup introuvable._";
  const html = DOMPurify.sanitize(marked.parse(md));
  el.innerHTML = `
    <h1>${esc(w.title)}</h1>
    <div class="writeup-meta">
      <span class="tag">${esc(w.ctf)}</span>
      <span class="tag">${esc(w.category)}</span>
      <span class="tag">par ${esc(w.author)}</span>
      <span class="tag">${fmtDate(w.date)}</span>
    </div>
    ${html}`;
}

(async () => {
  try {
    const [team, ctfs, writeups] = await Promise.all([
      load("data/team.json"), load("data/ctfs.json"), load("data/writeups.json"),
    ]);
    fillTeam(team);
    if ($("#writeup")) await renderWriteup(writeups);
    else renderHome(team, ctfs, writeups);
  } catch (err) {
    console.error(err);
    document.querySelector("main").insertAdjacentHTML("afterbegin",
      `<p style="color:var(--danger)">Erreur de chargement des données : ${esc(err.message)}</p>`);
  }
})();
