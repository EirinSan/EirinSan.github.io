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
const link = (url, label) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;

/* ---------- octets ---------- */

const hex2 = (b) => b.toString(16).padStart(2, "0");
const hex8 = (n) => n.toString(16).padStart(8, "0");

// mêmes familles que hexyl : nul, espace, imprimable, non-ASCII
function cls(b) {
  if (b === 0) return "b0";
  if (b === 0x20 || b === 0x0a || b === 0x09 || b === 0x0d) return "bw";
  if (b > 0x20 && b < 0x7f) return "bp";
  return "bx";
}

// 16 octets façon xxd (groupes de 2), la 2e moitié peut être masquée en CSS
function hexCells(bytes) {
  const cell = (i) => (i < bytes.length ? `<span class="${cls(bytes[i])}">${hex2(bytes[i])}</span>` : "  ");
  const group = (from) => {
    const parts = [];
    for (let i = from; i < from + 8; i += 2) parts.push(cell(i) + cell(i + 1));
    return parts.join(" ");
  };
  return `${group(0)}<span class="h2"> ${group(8)}</span>`;
}

/* ---------- lignes avec offset réel ---------- */

class Dump {
  constructor() { this.off = 0; }

  offset(n = this.off) {
    const h = hex8(n);
    return `<span class="hi">${h.slice(0, 4)}</span>${h.slice(4)}:`;
  }

  // plain = le texte dont on montre les octets ; html = ce qui est affiché
  row(plain, html, extra = "") {
    const bytes = enc.encode(plain);
    const out = `<div class="row ${extra}"><span class="o">${this.offset()}</span><span class="h">${hexCells(bytes)}</span><div class="t">${html}</div></div>`;
    this.off += bytes.length + 1;
    return out;
  }

  // une zone vide = mémoire à zéro, puis l'étoile de xxd pour les lignes répétées
  zeros(message) {
    const z = this.row("\0".repeat(16), "", "zero");
    this.off += 15;
    return `${z}<div class="row star"><span class="o">*</span><span class="h"></span><div class="t">${esc(message)}</div></div>`;
  }
}

function sectionHtml(d, { id, name, build, count }) {
  const start = d.off;
  const rows = build(d);
  const size = d.off - start;
  return `
    <section class="sect" id="${id}">
      <h2 class="sect-head"><span class="name">.${esc(name)}</span>
        <span class="meta">@ 0x${hex8(start)} · ${count} · ${size} octets</span>
        ${id === "writeups" ? `<span class="filters" id="filters"></span>` : ""}
      </h2>
      ${rows}
    </section>`;
}

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

/* ---------- page d'accueil ---------- */

function renderDump(team) {
  const text = `${team.name}\n${team.tagline}\n`;
  const bytes = enc.encode(text);
  const width = matchMedia("(max-width: 640px)").matches ? 8 : 16;
  const lines = [];
  for (let off = 0; off < bytes.length; off += width) {
    let hex = "";
    let ascii = "";
    for (let i = off; i < off + width; i++) {
      if (i > off && (i - off) % 2 === 0) hex += " ";
      if (i < bytes.length) {
        const b = bytes[i];
        hex += `<span class="${cls(b)}" data-b="${i}">${hex2(b)}</span>`;
        const ch = b > 0x20 && b < 0x7f ? esc(String.fromCharCode(b)) : ".";
        ascii += `<span class="a" data-b="${i}">${ch}</span>`;
      } else {
        hex += "  ";
      }
    }
    lines.push(`<span class="o">${hex8(off)}:</span> ${hex}  ${ascii}`);
  }
  const dump = $("#dump");
  dump.innerHTML = lines.join("\n");
  dump.setAttribute("aria-label", text.replace(/\n/g, " ").trim());

  let lit = [];
  const probe = $("#probe");
  dump.onpointerover = (e) => {
    const t = e.target.closest("[data-b]");
    lit.forEach((el) => el.classList.remove("hl"));
    if (!t) return;
    const i = +t.dataset.b;
    lit = [...dump.querySelectorAll(`[data-b="${i}"]`)];
    lit.forEach((el) => el.classList.add("hl"));
    const b = bytes[i];
    const what = b > 0x20 && b < 0x7f ? `'${String.fromCharCode(b)}'`
      : b === 0x0a ? "\\n" : b === 0x20 ? "espace" : "octet UTF-8";
    probe.innerHTML = `offset <b>0x${hex8(i)}</b> · 0x${hex2(b)} · ${b} · ${esc(what)}`;
  };
  dump.onpointerleave = () => {
    lit.forEach((el) => el.classList.remove("hl"));
    probe.textContent = "survole un octet";
  };
}

function renderHome(team, ctfs, writeups, filter) {
  const d = new Dump();
  d.off = enc.encode(`${team.name}\n${team.tagline}\n`).length; // après le dump d'ouverture

  const members = team.members || [];
  const results = [...ctfs].sort((a, b) => new Date(b.date) - new Date(a.date));
  const wus = [...writeups].sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter((w) => !filter || w.category === filter);

  const sections = [
    {
      id: "about", name: "about", count: "texte",
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
      id: "contact", name: "contact", count: "liens",
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
      renderHome(team, ctfs, writeups, btn.dataset.cat);
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
    const [team, ctfs, writeups] = await Promise.all([
      load("data/team.json"), load("data/ctfs.json"), load("data/writeups.json"),
    ]);
    if ($("#writeup")) {
      await renderWriteup(writeups);
      return;
    }
    document.title = team.name || document.title;
    renderDump(team);
    renderHome(team, ctfs, writeups, "");
    const updated = new Date(document.lastModified);
    if (!isNaN(updated)) $("#updated").textContent = `modifié le ${updated.toISOString().slice(0, 10)}`;
    matchMedia("(max-width: 640px)").addEventListener("change", () => renderDump(team));
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
  } catch (err) {
    console.error(err);
    $("#main").insertAdjacentHTML("afterbegin",
      `<p class="error">Impossible de charger les données : ${esc(err.message)}. Vérifie que les fichiers JSON dans data/ sont valides.</p>`);
  }
})();
