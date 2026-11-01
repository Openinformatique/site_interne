# Paramètres (front)

Menu : ADMINISTRATION › **Paramètres** (`/parametres`), rôles ADMIN et
DIRECTION. API : voir `back/src/modules/parametres/README.md`. Maquette
validée le 01/11/2026.

## Écran (`parametres-page/`)

- **À gauche, « Tables »** : recherche (code, nom ; sans accents), liste par
  code avec le nombre de paramètres ; la table choisie est surlignée (la
  première à l'arrivée). Crayon : modale de la table. « Nouvelle table ».
- **À droite, la table choisie** : « CODE — Nom », nombre de paramètres,
  aide ; recherche (clé, valeurs), « Afficher les inactifs », « Nouveau
  paramètre ». Tableau : clé (en-tête = libellé de la clé), une colonne par
  rubrique, statut, modifier / supprimer (confirmation ; refus expliqué si
  le paramètre est utilisé). Clic sur une ligne : modale du paramètre.
  Paramètres inactifs : rendu « inactif » commun.

## Modales

- **Table** (`table-modal/`) : code (4 caractères, majuscules, figé en
  modification), nom, libellé et taille de la clé, aide, « Afficher la clé
  devant le libellé dans les listes » ; rubriques modifiables (n° automatique,
  nom*, aide ; ajouter / supprimer, la 01 ne se supprime pas ; supprimer une
  rubrique renseignée demande confirmation avec le nombre de valeurs
  effacées). « Supprimer la table » (table vide seulement).
- **Paramètre** (`parametre-modal/`) : clé (taille de la table, figée en
  modification), statut, une zone de texte par rubrique avec son aide (la 01
  obligatoire).

Enregistrement immédiat, message vert en bas à droite. Le cache des listes
déroulantes (`ParametresApi`) est vidé pour la table modifiée
(`ParametresAdminApi`).

## Droits (accès UI)

Manifeste `access/parametres-page.access.ts` : page
(`parametres.page.access`, menu + garde de route avec rôles),
`parametres.button.create-table`, `parametres.button.create-parametre`,
`parametres.button.delete` (suppression de table ou de paramètre).

## Fichiers

- `parametres.routes.ts`, `core/api/parametres-admin-api.service.ts`,
  `core/models/parametre-admin.model.ts`.
