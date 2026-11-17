## Énoncé

> Un petit site de login, trouve le flag.

## Analyse

En regardant le code source de la page, on trouve un commentaire :

```html
<!-- TODO: retirer /admin.php.bak -->
```

## Exploitation

```bash
curl http://chall.exemple.ctf/admin.php.bak
```

Le backup contient le mot de passe admin en clair, on se connecte et on récupère le flag.

## Flag

`EXEMPLE{c3ci_3st_un_3x3mpl3}`
