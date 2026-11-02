# Module pointages (back)

Temps passé par les salariés, repris de l'application historique (table
`pointages` : voir [docs/schema-metier.md](../../../docs/schema-metier.md)).

Écran servi : **Pointages** (menu GÉNÉRAL › Pointages) — planning hebdomadaire
d'une personne, saisie, déplacement, changement de durée et suppression ;
édition « Relevé mensuel » (PDF et Excel).

## Droits

- Tout utilisateur authentifié consulte et saisit **ses** pointages.
- Les profils **Admin** et **Direction** consultent et saisissent ceux de toute
  personne. Sinon : `403 ACCESS_DENIED` (liste, création, modification,
  suppression), et la liste des personnes du référentiel se limite à
  l'utilisateur connecté.

## Dates et heures

`date_heure_debut` / `date_heure_fin` (datetime2) contiennent des **instants
UTC** — données reprises comprises (constaté : début de journée à 7 h UTC en
hiver, 6 h UTC en été, soit 8 h en France). L'API échange des instants ISO
8601 ; le front les affiche en heure locale.

Le pilote mssql de TypeORM lit et écrit les `datetime2` en heure locale du
serveur Node : le dépôt passe donc par du texte UTC explicite, en lecture
(`CONVERT(varchar(23), …, 126)` + `Z`), en filtre de période et en écriture
(`CAST(:debut AS datetime2)`). Helpers communs dans
`common/utils/sql-date.util.ts` (`sqlUtcText`, `utcTextToDate`,
`dateToUtcText`), aussi utilisés par les fiches client (mouvements de contrat)
et commande (temps passé), qui affichent le jour du pointage **à Paris**
(`jourMetier`, fuseau `Europe/Paris`).

## Codes `facturable`

| Code | Signification                                                   |
| ---- | --------------------------------------------------------------- |
| 0    | non facturable                                                  |
| 1    | facturable                                                      |
| 2    | en attente (nouveau code, propre à la nouvelle application)     |
| 3, 4 | codes repris de l'ancienne application, affichés « en attente » |

`temps_facturable` (« durée contrat », heures) : temps imputé à la commande / au
contrat (fiche commande, fiche client). Par défaut égal à la durée du créneau ;
il la suit pour un pointage non facturable.

## Règles de saisie

Contrôlées par `PointagesUseCase` (erreurs `VALIDATION_ERROR` par champ) :

- début et fin obligatoires, fin après début, 24 h au plus ;
- personne existante ; type d'action (`typeAction`) du paramétrage `TYPA` ;
- **client** obligatoire, sauf `AUTRE` (temps interne), `CP`, `FERIE`, `ARRET`
  (jamais de client dans les données reprises) ;
- `DEVIS` (développement sur devis) : **commande** du client **hors contrat**
  (`client_contrat_id` vide) ;
- `ASSC` / `ASST` (assistance sur contrat / téléphonique) : **commande** du
  client **sous contrat** (`client_contrat_id` renseigné) et **contact** ;
- commande et contact appartiennent au client ; pas de commande ni de contact
  sans client.

Les chevauchements de pointages sont admis (12 dans les données reprises).

## API

### `GET /api/v1/pointages/reference`

Référentiels de l'écran : `types` (`cle`, `libelle`, `couleur` « R,V,B » —
rubrique 02 de `TYPA`), `tags` (libellés de `TAGS`), `personnes` (utilisateurs
actifs, ou l'utilisateur seul — voir Droits), `clients` (clients actifs : `id`,
`code`, `nom`).

### `GET /api/v1/pointages/clients/:clientId/options`

`contacts` (`id`, `nom`, `actif`) et `commandes` (`id`, `numero` — n° de
commande client sinon n° de devis —, `libelle`, `contrat`, `cloturee`) du
client, commandes les plus récentes d'abord.

### `GET /api/v1/pointages?utilisateurId=…&du=…&au=…`

Pointages de la personne qui chevauchent `[du, au[` (instants ISO, 42 jours au
plus), par début croissant. Ligne : `id`, `utilisateurId`, `debut`, `fin`,
`typeAction`, `clientId`, `clientCode`, `clientNom`, `commandeId`,
`commandeNumero`, `contactId`, `contactNom`, `description`, `facturable`,
`tempsFacturable`.

### `POST /api/v1/pointages` — `PUT /api/v1/pointages/:id`

Corps : `utilisateurId`, `debut`, `fin`, `typeAction`, `clientId`,
`commandeId`, `contactId`, `description` (tags entre crochets en tête :
`[Tag 1] [Tag 2] texte`), `facturable` (0 à 4), `tempsFacturable` (0 à 24,
4 décimales). Renvoie le pointage enregistré. Le `PUT` sert aussi au
déplacement et au redimensionnement depuis le planning.

### `DELETE /api/v1/pointages/:id`

Suppression définitive (`204`).

### `POST /api/v1/pointages/import/verification` — `POST /api/v1/pointages/import`

Import de pointages depuis un classeur Excel (bouton « Importer » de l'écran
Pointages), pour la personne `utilisateurId` (multipart : `file`,
`utilisateurId` ; droits de la saisie). `verification` contrôle et renvoie
l'aperçu sans rien créer ; l'import refait tout le contrôle puis crée tous
les pointages dans une transaction. Au moindre défaut, **rien n'est créé**.
Réponse : `format` (contrôle des en-têtes ; null si le fichier n'est pas un
classeur lisible), `erreurs` (ligne, colonne, valeur lue, message),
`pointages` (aperçu), `importes`. Règles (`domain/import-pointages.ts`,
`application/import-pointages.use-case.ts`) :

- **Fichier** : .xlsx ou .xls (Excel 97-2003), lus avec SheetJS (`xlsx` 0.20.3,
  installé depuis cdn.sheetjs.com : la version npm est ancienne et
  vulnérable) ; seuls les vrais classeurs sont admis (signature ZIP ou OLE2).
- **Format** : première feuille ; ligne 1 = en-têtes exactement dans cet
  ordre (casse, accents et espaces indifférents) : Client, Type de tâche,
  Thème, Devis, Date, Durée, Observations, Contact ; rien au-delà de la
  colonne H. Sinon, aucune ligne n'est contrôlée. 5 Mo et 2 000 lignes au plus.
- **Lignes** à partir de la ligne 2, lignes entièrement vides ignorées :
  - A Client : **code client** d'un client actif ; vide = interne ;
  - B Type : clé TYPA (ASSC, COM, AUTRE…), obligatoire ;
  - C Thème : tags séparés par `;` ou `,` ; un tag du paramétrage TAGS est
    repris avec son libellé, sinon tag libre ; description « [Tag] texte » ;
  - D Devis : n° de commande (sinon de devis) d'une commande du client ; la
    commande **en cours** portant ce numéro ; erreur si toutes sont clôturées
    ou si plusieurs sont en cours ;
  - E Date : date Excel, numéro de série, JJ/MM/AAAA ou AAAA-MM-JJ ;
  - F Durée : heures, > 0 et ≤ 24 ;
  - G Observations : texte du pointage ;
  - H Contact : « NOM Prénom » d'un contact du client (actif de préférence).
- Puis les **règles de la saisie** (`PointagesUseCase.erreursSaisie`), chaque
  erreur rapportée sur sa colonne : client obligatoire selon le type,
  commande de contrat pour une assistance, contact obligatoire, etc.
- **Horaires** : chaque jour, à partir de **7 h** (Paris), les pointages se
  suivent dans l'ordre du fichier, **sans tenir compte des pointages déjà
  saisis** ce jour-là ; erreur si un jour dépasse minuit.
- Facturable « oui », temps facturable = durée (valeurs par défaut de la
  saisie).

### `GET /api/v1/pointages/alertes`

Cloche d'alertes de la barre du haut : jours incomplets de l'**utilisateur
connecté** (aucun paramètre), du plus récent au plus ancien. Règles
(`domain/alertes-pointage.ts`) :

- jours examinés : les 14 jours calendaires précédant aujourd'hui (à Paris,
  aujourd'hui exclu), du lundi au vendredi seulement ;
- heures du jour = durée (fin − début) de **tous** ses pointages commencés ce
  jour-là à Paris, absences comprises (congés, fériés, arrêts) ;
- alerte si moins de **7 h** (`HEURES_ATTENDUES`) ; un férié non pointé
  déclenche donc l'alerte ;
- ligne : `jour`, `heures`, `manquantes` (7 − heures), `joursEcoules`
  (1 = hier).

### `GET /api/v1/pointages/releve.pdf?utilisateurId=…&annee=…&mois=…&contenu=…`

Édition PDF « Relevé mensuel des pointages » (écran Pointages › Éditions ›
Relevé mensuel), renvoyée `inline` (le front l'ouvre dans un nouvel onglet).
Mêmes droits que la liste (`403` pour la personne d'un autre sans profil Admin
ou Direction). `mois` de 1 à 12 ; `contenu` : `detail` (défaut) ou `synthese`.
Nom de fichier : `Releve_AAAA-MM_<nom affiché>[_synthese].pdf`.

Règles (`domain/releve-mensuel.ts`, reprises de l'ancien relevé) :

- pointages **commençant** dans le mois, heure de Paris ; temps = durée des
  créneaux (pas `temps_facturable`) ;
- regroupement **client** (code client ; `INTERNE` pour le temps sans client)
  › **type d'action** (libellé TYPA) › **commande** (n° de commande client,
  sinon n° de devis) ;
- une ligne par **description et statut facturable** (Oui ; Non ; En attente
  pour les codes 2 à 4), heures cumulées ;
- tri binaire, comme l'ancien relevé (majuscules, puis `[`, puis minuscules) ;
- vignettes : temps de travail, clients, interne (sans client hors absences),
  absences (`CP`, `FERIE`, `ARRET`) ;
- en-tête : nom affiché de l'utilisateur (`users.display_name`).

Rendu : `pdf/infrastructure/releve-mensuel.renderer.ts` (gabarit
`releve-mensuel`). Détaillé : colonnes Client / Type / N° cde / Description /
Temps / Facturable, totaux par commande et type (teinte de la couleur TYPA),
par client et général, rappel « (suite) » en haut de page. Synthétique :
Client / Type d'action / Commandes / Temps, sans totaux.

### `GET /api/v1/pointages/releve.xlsx?utilisateurId=…&annee=…&mois=…`

Même relevé, **détaillé uniquement**, en classeur Excel téléchargé
(`attachment`, `Releve_AAAA-MM_<nom>.xlsx`) : titre en ligne 1, tableau
filtrable à partir de la ligne 3 (Client / Type d'action / N° cde /
Description / Temps (h) / Facturable, groupes répétés sur chaque ligne, même
ordre que le PDF), ligne « Total temps de travail » en bas (formule `SOMME`).
Rendu : `infrastructure/exceljs-releve.spreadsheet.ts` (port
`RELEVE_SPREADSHEET`).

### `GET /api/v1/pointages/export-cfl.pdf?du=…&au=…&clientId=…`

« Export (format CFL) » — travaux réalisés pour **un client** (obligatoire)
sur une période `du` → `au` (« AAAA-MM-JJ », jours à Paris, bornes incluses,
un an au plus). Filtres facultatifs : `commandeId` (commande du client),
`utilisateurId` (Admin / Direction ; les autres profils n'exportent que leurs
pointages, une autre personne → `403`), `typeAction`, `tags` (« a,b » ou
paramètre répété : **au moins un** des tags en tête de la description, sans
casse ni accents) ou `sansTag=true` (description sans tag). Lignes **du plus
récent au plus ancien** : Demandeur (contact « NOM Prénom »), Date, Libellé
(description complète), Tps (mn) = **durée du créneau**, Pers. (salarié).
PDF `inline` (maquette validée le 02/11/2026, gabarit `export-cfl` du module
pdf) : en-tête logo, titre, client, période et filtres ; synthèse pointages /
temps total / minutes ; tableau encadré, ligne de total ; pied « Page x / n »
et « Édité le … ». Contrôleur séparé : `presentation/export-cfl.controller.ts`.

## Structure

- `domain/pointage.port.ts` — port, types, codes facturable, types d'action
  soumis à règle.
- `application/pointages.use-case.ts` (+ spec) — droits et règles de saisie.
- `domain/releve-mensuel.ts` (+ spec) — regroupement et cumuls du relevé,
  bornes du mois.
- `application/releve-mensuel.use-case.ts` — éditions PDF et Excel du
  relevé.
- `infrastructure/exceljs-releve.spreadsheet.ts` (+ spec) — classeur Excel.
- `infrastructure/typeorm-pointage.repository.ts` — requêtes TypeORM.
- `presentation/pointages.controller.ts`, `presentation/dto/pointage.dto.ts`.
- Export (format CFL) : `domain/export-cfl.ts` (+ spec, filtres et tags),
  `application/export-cfl.use-case.ts` (droits, période),
  `infrastructure/typeorm-export-cfl.repository.ts` (port `EXPORT_CFL`),
  `presentation/export-cfl.controller.ts`, `presentation/dto/export-cfl.dto.ts`.
