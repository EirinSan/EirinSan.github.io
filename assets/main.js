// Tout le contenu du site vient des fichiers dans /data et /writeups
// (modifiés à la main ou par le bot Discord). Pas besoin de toucher à ce fichier.

const $ = (sel) => document.querySelector(sel);
const enc = new TextEncoder();

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

const iso = (d) => {
  const date = new Date(d);
  return isNaN(date) ? esc(d) : date.toISOString().slice(0, 10);
};
const ordinal = (n) => (n === 1 ? "1er" : `${n}e`);

// "2026-12-06" (jour seul, heure locale) ou "2026-12-06T18:00:00+00:00" (avec heure)
const hasTime = (s) => typeof s === "string" && s.includes("T");
function parseWhen(s) {
  const m = !hasTime(s) && /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
}
function when(s) {
  const d = parseWhen(s);
  if (isNaN(d)) return esc(s);
  const day = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  return hasTime(s) ? `${day} ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : day;
}
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
function countdown(start, finish) {
  const now = new Date();
  const s = parseWhen(start);
  const f = finish ? parseWhen(finish) : new Date(midnight(s) + 86400000);
  if (now >= s && now < f) return "en cours";
  const hours = (s - now) / 3600000;
  if (hasTime(start) && hours < 24) return `dans ${Math.max(1, Math.round(hours))} h`;
  const days = Math.round((midnight(s) - midnight(now)) / 86400000);
  if (days <= 0) return "aujourd'hui";
  return days === 1 ? "demain" : `dans ${days} j`;
}
// un CTF reste dans l'agenda jusqu'à sa fin (ou la fin du jour de début)
function isUpcoming(u) {
  if (!u.start) return true;
  const start = parseWhen(u.start);
  const end = u.finish ? parseWhen(u.finish) : new Date(midnight(start) + 86400000);
  return isNaN(end) || end.getTime() > Date.now();
}
const link = (url, label) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;

/* ---------- octets ---------- */

const hex8 = (n) => n.toString(16).padStart(8, "0");

/* ---------- lignes avec offset réel ---------- */

class Dump {
  constructor() { this.off = 0; }

  offset(n = this.off) {
    const h = hex8(n);
    return h.slice(4);
  }

  // plain = le texte dont on montre les octets ; html = ce qui est affiché
  row(plain, html, extra = "") {
    const bytes = enc.encode(plain);
    const out = `<div class="row ${extra}"><span class="o">${this.offset()}</span><div class="t">${html}</div></div>`;
    this.off += bytes.length + 1;
    return out;
  }

  // une zone vide = mémoire à zéro, puis l'étoile de xxd pour les lignes répétées
  zeros(message) {
    const z = this.row("\0".repeat(16), `<span class="b0">00 00 00 00 00 00 00 00</span>`, "zero");
    this.off += 15;
    return `${z}<div class="row star"><span class="o">*</span><div class="t">${esc(message)}</div></div>`;
  }
}

function sectionHtml(d, { id, name, build, count }) {
  const rows = build(d);
  return `
    <section class="sect" id="${id}">
      <h2 class="sect-head"><span class="name">.${esc(name)}</span>
        <span class="meta">${count}</span>
        ${id === "writeups" ? `<span class="filters" id="filters"></span>` : ""}
      </h2>
      ${rows}
    </section>`;
}

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

/* ---------- page d'accueil ---------- */

// le nom de la team écrit comme un flag : Nom{accroche_en_snake_case}
function renderFlag(team) {
  const body = (team.tagline || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  $("#flag").innerHTML = `<span class="fl-name">${esc(team.name)}</span><span class="brace">{</span>`
    + `<span class="fl-body">${esc(body).replace(/_/g, "_<wbr>")}</span><span class="brace">}</span>`;
  $("#flag").setAttribute("aria-label", `${team.name}, ${team.tagline}`);
}

function renderHome(team, ctfs, writeups, upcoming, filter) {
  const d = new Dump();
  d.off = enc.encode(`${team.name}\n${team.tagline}\n`).length; // après le titre

  const members = team.members || [];
  const results = [...ctfs].sort((a, b) => new Date(b.date) - new Date(a.date));
  const agenda = upcoming.filter(isUpcoming)
    .sort((a, b) => parseWhen(a.start || "9999-12-31") - parseWhen(b.start || "9999-12-31"));
  const wus = [...writeups].sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter((w) => !filter || w.category === filter);

  const sections = [
    {
      id: "about", name: "about", count: "",
      build: (d) => [
        d.row(team.about, `<p>${esc(team.about)}</p>`),
        d.row(`categories: ${(team.categories || []).join(", ")}`,
          `<span class="dim">catégories :</span> ${esc((team.categories || []).join(", "))}`),
        team.bugs ? d.row(`bugs: ${team.bugs}`, `<span class="dim">bogues :</span> ${esc(team.bugs)}`) : "",
      ].join(""),
    },
    {
      id: "membres", name: "membres", count: plural(members.length, "entrée", "entrées"),
      build: (d) => members.length ? members.map((m) => {
        const links = Object.entries(m.links || {}).map(([k, u]) => link(u, k)).join(" ");
        const spe = (m.specialties || []).join(", ");
        return d.row(`${m.name} ${m.role}`,
          `<strong>${esc(m.name)}</strong> ${esc(m.role)}${spe ? ` <span class="dim">· ${esc(spe)}</span>` : ""}${links ? ` · ${links}` : ""}`);
      }).join("") : d.zeros("personne pour l'instant"),
    },
    {
      id: "agenda", name: "agenda", count: `${agenda.length} à venir`,
      build: (d) => agenda.length ? agenda.map((u) => {
        const dates = u.start ? `${when(u.start)}${u.finish ? ` → ${when(u.finish)}` : ""}` : "date à venir";
        const name = u.url ? link(u.url, u.name) : `<strong>${esc(u.name)}</strong>`;
        const extra = [u.format, u.ctftime ? link(u.ctftime, "ctftime") : ""].filter(Boolean).join(" · ");
        return d.row(`${u.start || ""} ${u.name}`,
          `${u.start ? `<span class="tag">${esc(countdown(u.start, u.finish))}</span> ` : ""}${name} <span class="dim">· ${dates}</span>${extra ? ` <span class="dim">· ${extra}</span>` : ""}`);
      }).join("") : d.zeros("aucun CTF prévu pour l'instant"),
    },
    {
      id: "resultats", name: "resultats", count: plural(results.length, "CTF", "CTF"),
      build: (d) => results.length ? results.map((c) => {
        const place = c.place ? `${ordinal(c.place)}${c.total ? `/${c.total}` : ""}` : "-";
        return d.row(`${iso(c.date)} ${c.name} ${place}`,
          `<span class="dim">${iso(c.date)}</span> ${c.url ? link(c.url, c.name) : `<strong>${esc(c.name)}</strong>`} · <strong>${esc(place)}</strong>${c.points != null ? ` <span class="dim">· ${esc(c.points)} pts</span>` : ""}`);
      }).join("") : d.zeros("rien encore, le premier CTF arrive bientôt"),
    },
    {
      id: "writeups", name: "writeups", count: plural(wus.length, "fichier", "fichiers"),
      build: (d) => wus.length ? wus.map((w) => d.row(`${w.id}.md`,
        `<a href="writeup.html?id=${encodeURIComponent(w.id)}">${esc(w.id)}.md</a> <span class="tag">${esc(w.category)}</span> <span class="dim">· ${esc(w.ctf)} · ${esc(w.author)} · ${iso(w.date)}</span>`)).join("")
        : d.zeros(filter ? `aucun writeup ${filter}` : "vide, les premiers writeups arrivent après le prochain CTF"),
    },
    {
      id: "contact", name: "contact", count: "",
      build: (d) => {
        const rows = [d.row(team.join, `<p>${esc(team.join)}</p>`)];
        const seen = new Set();
        const add = (label, url) => {
          if (!url || seen.has(url)) return;
          seen.add(url);
          rows.push(d.row(`${label} ${url}`, `<span class="dim">${esc(label.toLowerCase())} →</span> ${link(url, url.replace(/^https?:\/\//, ""))}`));
        };
        add("Discord", team.discord);
        add("CTFtime", team.ctftime);
        Object.entries(team.socials || {}).forEach(([k, u]) => add(k, u));
        return rows.join("");
      },
    },
  ];

  $("#sections").innerHTML = sections.map((s) => sectionHtml(d, s)).join("");
  $("#size").textContent = `${d.off} octets`;
  $("#eof").textContent = `EOF @ 0x${hex8(d.off)}`;

  // filtres des writeups
  const cats = [...new Set(writeups.map((w) => w.category).filter(Boolean))].sort();
  if (cats.length > 1) {
    $("#filters").innerHTML = ["", ...cats].map((c) =>
      `<button type="button" data-cat="${esc(c)}" aria-pressed="${c === (filter || "")}">${esc(c || "tout")}</button>`).join("");
    $("#filters").onclick = (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      renderHome(team, ctfs, writeups, upcoming, btn.dataset.cat);
      $("#writeups").scrollIntoView({ block: "start" });
    };
  }
}

/* ---------- page writeup ---------- */

async function renderWriteup(writeups) {
  const el = $("#writeup");
  const id = new URLSearchParams(location.search).get("id");
  const w = writeups.find((x) => x.id === id);
  if (!w) {
    el.innerHTML = `<h1 class="wu-title">introuvable</h1><p>Pas de writeup « ${esc(id)} ». <a href="index.html#writeups">Voir la liste</a>.</p>`;
    return;
  }
  document.title = `${w.title} · ${w.ctf}`;
  $("#wu-file").textContent = `writeups/${w.id}.md`;

  const res = await fetch(`writeups/${encodeURIComponent(w.id)}.md`, { cache: "no-cache" });
  const md = res.ok ? await res.text() : "_Le fichier de ce writeup est introuvable._";
  const tmp = document.createElement("div");
  tmp.innerHTML = DOMPurify.sanitize(marked.parse(md));

  const d = new Dump();
  const head = [
    d.row(`ctf: ${w.ctf}`, `<span class="dim">ctf :</span> ${esc(w.ctf)}`),
    d.row(`categorie: ${w.category}`, `<span class="dim">catégorie :</span> <span class="tag">${esc(w.category)}</span>`),
    d.row(`auteur: ${w.author}`, `<span class="dim">auteur :</span> ${esc(w.author)}`),
    d.row(`date: ${iso(w.date)}`, `<span class="dim">date :</span> ${iso(w.date)}`),
  ].join("");
  const body = [...tmp.children].map((node) => d.row(node.textContent.trim(), node.outerHTML)).join("");

  el.innerHTML = `<h1 class="wu-title">${esc(w.title)}</h1>
    <section class="sect">${head}</section>
    <section class="sect md">${body}</section>`;
  el.querySelectorAll(".md a").forEach((a) => { a.target = "_blank"; a.rel = "noopener"; });
  $("#size").textContent = `${d.off} octets`;
  $("#eof").textContent = `EOF @ 0x${hex8(d.off)}`;
}

/* ---------- démarrage ---------- */

(async () => {
  try {
    const [team, ctfs, writeups, upcoming] = await Promise.all([
      load("data/team.json"), load("data/ctfs.json"), load("data/writeups.json"),
      load("data/upcoming.json").catch(() => []),
    ]);
    if ($("#writeup")) {
      await renderWriteup(writeups);
      return;
    }
    document.title = team.name || document.title;
    renderFlag(team);
    renderHome(team, ctfs, writeups, upcoming, "");
    const updated = new Date(document.lastModified);
    if (!isNaN(updated)) $("#updated").textContent = `modifié le ${updated.toISOString().slice(0, 10)}`;
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
  } catch (err) {
    console.error(err);
    $("#main").insertAdjacentHTML("afterbegin",
      `<p class="error">Impossible de charger les données : ${esc(err.message)}. Vérifie que les fichiers JSON dans data/ sont valides.</p>`);
  }
})();
