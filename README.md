# Site de la team CTF

Site statique hébergé avec GitHub Pages. Pas de build : tout le contenu se modifie dans `data/`, à la main ou avec le bot Discord. Les writeups ne sont pas publiés ici : ils restent privés dans le Discord de la team.

## Modifier le contenu

| Fichier | Contenu |
|---|---|
| `data/team.json` | Nom de la team, textes (`tagline`, `about`, `join`, `bugs`), liens Discord / CTFtime, membres |
| `data/upcoming.json` | Prochains CTF de la team (nom, `start`, `finish`, `url`, `ctftime`, `format`). Les CTF terminés disparaissent tout seuls. |
| `data/ctfs.json` | Résultats des CTF (nom, date, place, nombre d'équipes, points) |

### Ajouter un membre

Ajoute un objet dans `members` de `data/team.json`. `avatar` peut être une URL d'image (ex. `https://github.com/<pseudo>.png`), ou rester vide pour afficher l'initiale.

## Activer GitHub Pages

Settings → Pages → Source : **Deploy from a branch**, branche `main`, dossier `/ (root)`.
Le site sera sur `https://eirinsan.github.io/`.

## Tester en local

```bash
python3 -m http.server 8000
```

Puis ouvre http://localhost:8000 (ouvrir `index.html` directement ne marche pas : il faut un serveur pour charger les fichiers JSON).

Les fichiers CSS déjà présents (`Discord.css`, `anilist.css`, `simplify.css`, `file/`) restent servis aux mêmes URLs.
