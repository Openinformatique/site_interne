# Export (format CFL) (front)

Pointages › bouton **Éditions** › **Export (format CFL)** — « Travaux
réalisés pour un client, sur une période ». Maquettes (fenêtre et PDF)
validées le 02/11/2026. API : `GET /pointages/export-cfl.pdf` (voir
`back/src/modules/pointages/README.md`).

## Fenêtre (`export-cfl-modal.component.*`, 640 px)

Libellés à gauche, comme la saisie d'un pointage :

- **Période*** : Du / au, **mois en cours** par défaut ; raccourci « Mois
  précédent » (mois qui précède la date de début) ; un an au plus.
- **Client*** : obligatoire (« Choisissez un client. ») ; clients actifs.
- **Commande** : « Toutes les commandes » ; grisée sans client ; changer de
  client vide la commande et recharge les commandes du client.
- **Personne** : « Toutes les personnes » pour Admin et Direction ; liste
  figée sur l'utilisateur connecté pour les autres profils (bulle
  d'explication).
- **Type** : « Tous les types » ou un type d'action (`TYPA`).
- **Tags** : pastilles avec saisie assistée (`TAGS`) ou tag libre (Entrée,
  Tab, sortie du champ ; Retour arrière retire le dernier) ; un pointage est
  repris s'il porte **au moins un** des tags. Case **« Uniquement les
  pointages sans tag »** : vide et grise le champ. Une ligne d'aide rappelle
  la règle appliquée.
- **Ouvrir le PDF** : contrôles de saisie (mêmes messages que le back), puis
  PDF ouvert dans un **nouvel onglet** du navigateur ; « Préparation du
  PDF… » pendant la génération.

Règles de saisie et période par défaut : `export-cfl.utils.ts` (+ spec).

## Ouverture

`ouvrirExportCfl(modal)` (exportée par le composant), appelée par
`PointagesPageComponent.ouvrirExportCfl()` (4e option du menu Éditions) ;
classe de fenêtre `fiche-modal-export-cfl` (`styles/_custom.scss`).
