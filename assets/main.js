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
  if (!res.ok) throw new Error(`${path} introuvable (${res.status})`);
  return res.json();
}

// dates au format ISO, comme dans un terminal
function iso(d) {
  const date = new Date(d);
  return isNaN(date) ? esc(d) : date.toISOString().slice(0, 10);
}

function ordinal(n) {
  return n === 1 ? "1er" : `${n}e`;
}

function link(url, label) {
  return `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
}

function fillTeam(team) {
  document.querySelectorAll("[data-team]").forEach((el) => {
    const v = team[el.dataset.team];
    if (v) el.textContent = v;
  });
  const updated = new Date(document.lastModified);
  if (!isNaN(updated)) $("#updated").textContent = updated.toISOString().slice(0, 10);
}

function renderHome(team, ctfs, writeups) {
  $("#categories").textContent = (team.categories || []).join(", ");

  // AUTEURS
  $("#member-list").innerHTML = (team.members || []).map((m) => {
    const links = Object.entries(m.links || {}).map(([k, url]) => link(url, k)).join(", ");
    const spe = (m.specialties || []).join(", ");
    return `
      <dt>${esc(m.name)}</dt>
      <dd>${esc(m.role)}${spe ? `. Surtout ${esc(spe)}.` : ""}${links ? ` <span class="dim">(${links})</span>` : ""}</dd>`;
  }).join("");

  // HISTORIQUE
  const sorted = [...ctfs].sort((a, b) => new Date(b.date) - new Date(a.date));
  $("#results").innerHTML = sorted.length
    ? `<div class="scroll"><table>
        <thead><tr><th>date</th><th>ctf</th><th>place</th><th>pts</th></tr></thead>
        <tbody>${sorted.map((c) => `
          <tr>
            <td>${iso(c.date)}</td>
            <td>${c.url ? link(c.url, c.name) : esc(c.name)}</td>
            <td>${c.place ? ordinal(c.place) : "-"}${c.total ? `<span class="dim">/${esc(c.total)}</span>` : ""}</td>
            <td>${esc(c.points ?? "-")}</td>
          </tr>`).join("")}</tbody></table></div>`
    : `<p>Pas encore de résultat ici. Le premier CTF arrive bientôt, et tout ce qu'on joue se retrouve aussi sur ${team.ctftime ? link(team.ctftime, "CTFtime") : "CTFtime"}.</p>`;

  // FICHIERS (writeups façon ls -l)
  const cats = ["tout", ...new Set(writeups.map((w) => w.category).filter(Boolean))];
  let current = "tout";
  const draw = () => {
    const items = [...writeups]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .filter((w) => current === "tout" || w.category === current);
    const authorW = Math.max(0, ...items.map((w) => (w.author || "").length));
    const catW = Math.max(0, ...items.map((w) => (w.category || "").length));
    const rows = items.map((w) =>
      `<div class="row"><span class="dim">-rw-r--r--</span> ${esc((w.author || "").padEnd(authorW))} ${esc((w.category || "").padEnd(catW))} ${iso(w.date)} <a href="writeup.html?id=${encodeURIComponent(w.id)}">${esc(w.id)}.md</a>  <span class="dim">${esc(w.ctf)}</span></div>`);
    $("#writeup-list").innerHTML =
      `<div class="row dim">total ${items.length}</div>${rows.join("")}`;
  };
  if (cats.length > 2) {
    $("#writeup-filters").innerHTML = "filtrer : " + cats
      .map((c) => `<button type="button" data-cat="${esc(c)}" aria-pressed="${c === current}">${esc(c)}</button>`)
      .join(" / ");
    $("#writeup-filters").addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      current = btn.dataset.cat;
      document.querySelectorAll("#writeup-filters button")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      draw();
    });
  }
  draw();
  if (!writeups.length) {
    $("#writeup-list").insertAdjacentHTML("afterend",
      `<p class="dim">Vide pour l'instant. Les premiers writeups arrivent après notre prochain CTF.</p>`);
  }

  // VOIR AUSSI
  const see = [];
  if (team.ctftime) see.push(link(team.ctftime, "ctftime(1)"));
  if (team.discord) see.push(link(team.discord, "discord(1)"));
  Object.entries(team.socials || {}).forEach(([k, url]) => {
    if (url !== team.ctftime && url !== team.discord) see.push(link(url, `${k.toLowerCase()}(1)`));
  });
  $("#see-also").innerHTML = see.join(", ");
}

async function renderWriteup(writeups) {
  const el = $("#writeup");
  const id = new URLSearchParams(location.search).get("id");
  const w = writeups.find((x) => x.id === id);
  if (!w) {
    el.innerHTML = `<h2>NOM</h2><div class="body"><p>Pas de writeup « ${esc(id)} ». <a href="index.html#fichiers">Voir la liste</a>.</p></div>`;
    return;
  }
  const manId = `${w.id.toUpperCase()}(1)`;
  ["#wu-id", "#wu-id2", "#wu-id3"].forEach((s) => { $(s).textContent = manId; });
  document.title = `${w.title} · ${w.ctf}`;

  const res = await fetch(`writeups/${encodeURIComponent(w.id)}.md`, { cache: "no-cache" });
  const md = res.ok ? await res.text() : "_Le fichier du writeup est introuvable._";
  el.innerHTML = `
    <h2>NOM</h2>
    <div class="body"><p><b>${esc(w.title)}</b> - ${esc(w.category)}, ${esc(w.ctf)}</p></div>
    <h2>AUTEUR</h2>
    <div class="body"><p>${esc(w.author)}, le ${iso(w.date)}</p></div>
    <div class="body md">${DOMPurify.sanitize(marked.parse(md))}</div>`;
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
      `<p class="error">Impossible de charger les données : ${esc(err.message)}. Vérifie que le fichier JSON est valide.</p>`);
  }
})();
