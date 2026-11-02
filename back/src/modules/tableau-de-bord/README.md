# Module tableau-de-bord (back)

Modules du **tableau de bord** (menu GÉNÉRAL › Tableau de bord) : contrats à
renouveler, commandes à livrer, congés des 15 prochains jours. Lecture seule,
à partir des tables `client_contrats`, `commandes` et `pointages`.

Toutes les routes sont accessibles à tout utilisateur authentifié. Le masquage
d'un module par profil se fait côté front (accès UI `dashboard.section.*`).
« Aujourd'hui » = jour à Paris (`jourMetier`).

## API

| Route                                               | Rôle                                       |
| --------------------------------------------------- | ------------------------------------------ |
| `GET /api/v1/tableau-de-bord/contrats-a-renouveler` | contrats de plus d'1 h dont il reste ≤ 1 h |
| `GET /api/v1/tableau-de-bord/commandes-a-livrer`    | commandes en retard ou à livrer sous 14 j  |
| `GET /api/v1/tableau-de-bord/conges`                | congés de l'équipe sur 15 jours            |

### Contrats à renouveler

- Contrats **en cours** : client actif (et non supprimé), contrat sans
  échéance ou dont l'échéance est aujourd'hui ou après. La table des contrats
  n'a pas de statut actif / inactif.
- Suivi en heures selon les règles de la fiche client
  (`clients/domain/contrat-suivi.ts`) : crédit = jours commandés × `HJOUR`,
  débit = temps facturable des pointages des commandes du contrat, à partir de
  la première commande.
- Retenus si le **crédit total dépasse 1 h** (`CREDIT_MINIMUM`) et s'il
  **reste 1 h ou moins** (`RESTANT_MAXIMUM`, valeur arrondie à 4 décimales), épuisés compris (restant ≤ 0).
- Tri : restant croissant, puis raison sociale.
- `joursAvantEcheance` : jours jusqu'à l'échéance (null sans échéance).

### Commandes à livrer

- Commandes **non clôturées** avec un délai, dont le délai est dépassé ou
  au plus tard dans **14 jours** (`HORIZON_COMMANDES`), clients non supprimés
  (actifs ou non). Pas de limite d'ancienneté du retard.
- `joursAvantDelai` : négatif = retard ; `joursPasses` = heures pointées ÷ `HJOUR`.
- Tri : délai croissant (le plus en retard d'abord), puis identifiant.

### Congés des 15 prochains jours

Fenêtre : aujourd'hui et les 14 jours suivants. Congés de **toute l'équipe**
(seuls le nom et les jours sont renvoyés, pas le détail des pointages).
Règles dans `domain/conges.ts` :

- **Jour de congé** : pointages `CP` d'une personne le même jour (à Paris),
  durées cumulées. Moins de `HJOUR` ÷ 2 + 1 h → demi-journée : **matin** si le
  dernier pointage finit à 13 h au plus tard, sinon **après-midi** ; sinon
  journée entière.
- **Congé** : jours de CP consécutifs ; seuls des week-ends ou des **fériés
  pointés par la personne** (`FERIE`) peuvent les séparer. Un congé qui
  s'arrête le matin ou un congé qui reprend l'après-midi n'est pas prolongé
  (la personne a travaillé entre les deux).
- Pointages lus 62 jours avant et après la fenêtre : un congé qui la déborde
  est reconstitué en entier (`nbJours` = durée totale, demi-journée = 0,5).
- `jours` : jours du congé dans la fenêtre ; `feries` : fériés pointés par la
  personne dans la fenêtre (affichés hachurés sur sa ligne).
- `retour` : premier jour ni week-end ni férié de la personne après le congé ;
  l'après-midi du dernier jour si le congé finit le matin.
- Tri : premier jour du congé, puis nom (`users.display_name`). Une personne
  qui a deux congés dans la fenêtre a deux lignes.

## Organisation

| Couche         | Fichier                                                       |
| -------------- | ------------------------------------------------------------- |
| domain         | `tableau-de-bord.port.ts`, `conges.ts`, `jours.ts`            |
| application    | `tableau-de-bord.use-case.ts` (seuils, horizon, fenêtre)      |
| infrastructure | `typeorm-tableau-de-bord.repository.ts`                       |
| presentation   | `tableau-de-bord.controller.ts`, `dto/tableau-de-bord.dto.ts` |

## Tests

- `conges.spec.ts` : regroupement des jours, fériés, demi-journées, reprise,
  fenêtre et tri ;
- `tableau-de-bord.use-case.spec.ts` : restant ≤ 1 h (arrondi) et crédit > 1 h, tri,
  horizon de 14 jours, conversion en jours, fenêtre de 15 jours.

Les requêtes ont été vérifiées sur la base locale.
