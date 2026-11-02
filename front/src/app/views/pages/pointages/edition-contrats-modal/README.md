# Édition des contrats d'assistance (front)

Pointages › bouton **Éditions** (fin de barre d'outils) › **Contrats
d'assistance** — « Suivi de chaque contrat, PDF réunis dans un zip ».
Maquette validée le 02/11/2026. Accessible à tous les profils. API : voir
`back/src/modules/clients/README.md` (routes `/contrats-assistance`).

## Fenêtre (`edition-contrats-modal.component.*`, 560 px)

Libellés à gauche, comme la saisie d'un pointage :

- **Arrêté au*** : date du jour par défaut ; obligatoire.
- **Groupe** (paramétrage `GSOC`), **Client**, **Contrat** : facultatifs
  (« Tous … »), **en cascade** — changer le groupe vide le client et le
  contrat, changer le client vide le contrat ; la liste des contrats reste
  grisée sans client. Seuls les groupes et clients ayant un contrat sont
  proposés.
- **Compteur** : « 7 contrats seront édités (un PDF chacun), arrêtés au
  31/10/2026. » ; « Aucun contrat ne correspond à ces critères. » (fond gris).
- **Télécharger le zip (n PDF)** : désactivé sans contrat ; « Préparation du
  zip… » pendant la génération (plusieurs secondes pour tous les contrats) ;
  puis téléchargement de « Contrats assistance au 31-10-2026.zip », fenêtre
  fermée et petit message en bas à droite.

Un contrat est édité s'il est **en cours** à la date d'arrêté (mis en place
au plus tard ce jour-là, sans échéance ou échéance ce jour-là ou après) ;
même règle que le back (`edition-contrats.utils.ts`, + spec).

## Ouverture

`ouvrirEditionContrats(modal)` (exportée par le composant), appelée par
`PointagesPageComponent.ouvrirEditionContrats()` ; classe de fenêtre
`fiche-modal-edition-contrats` (`styles/_custom.scss`).
