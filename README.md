# Site de la team CTF

Site statique hébergé avec GitHub Pages. Pas de build : tout le contenu se modifie dans `data/` et `writeups/`.

## Modifier le contenu

| Fichier | Contenu |
|---|---|
| `data/team.json` | Nom de la team, description, liens Discord / CTFtime, membres |
| `data/ctfs.json` | Résultats des CTF (nom, date, place, nombre d'équipes, points) |
| `data/writeups.json` | Liste des writeups |
| `writeups/<id>.md` | Contenu d'un writeup en Markdown |

### Ajouter un writeup

1. Crée `writeups/mon-ctf-nom-du-chall.md` et écris le writeup en Markdown.
2. Ajoute une entrée dans `data/writeups.json` avec le même `id` :

```json
{
  "id": "mon-ctf-nom-du-chall",
  "title": "Nom du chall",
  "ctf": "Mon CTF 2026",
  "category": "pwn",
  "author": "pseudo",
  "date": "2026-11-17"
}
```

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
