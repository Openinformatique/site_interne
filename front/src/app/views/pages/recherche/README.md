# Recherche globale (front)

Barre de recherche du haut (`views/layout/recherche-globale/`) et onglet de
résultats (`/recherche?q=…`, ce dossier). API et règles : voir
`back/src/modules/recherche/README.md`. Maquette validée le 02/11/2026.

## Barre du haut (`app-recherche-globale`)

- Texte d'aide « Rechercher un client, une commande, un pointage… ».
  Recherche 250 ms après la saisie, à partir de 2
  caractères.
- **Liste déroulante groupée** : Clients, Commandes, Pointages (icône, nombre
  total), 4 résultats au plus par groupe, termes surlignés (casse et accents
  indifférents), « Voir les N … » si le groupe en compte plus, message par
  groupe vide.
  - client : « code · raison sociale », ville et groupe ; « Inactif » à droite ;
  - commande : « n° · libellé », client (et contrat) ; « En cours » /
    « Clôturée » ;
  - pointage : description, « date · personne · client » ; durée.
- Clavier : ↑ ↓ choisissent un résultat, Entrée l'ouvre (sans choix : onglet
  de tous les résultats), Échap ferme. La liste se ferme quand le champ perd
  le focus.

## Onglet « Recherche : terme » (`recherche-page`)

Un onglet par recherche, avec une loupe devant son titre (`ICONES_HORS_MENU`
de `layout/sidebar/menu.ts` : la page n'a pas d'entrée de menu). En-tête : titre, pastilles « N clients · N commandes
· N pointages » (raccourcis vers les sections), rappel des règles. Trois
cartes (200 résultats au plus chacune, « 200 premiers sur N » au-delà) :

- **Clients** : code, raison sociale, ville, groupe, statut ;
- **Commandes** : client, n°, libellé (contrat dessous), date, statut ;
- **Pointages** : date, personne, client (« Interne »), commande, type,
  durée, description ; total d'heures (sur tous les pointages trouvés).

Clic (ou Entrée) : client → fiche client, commande → fiche commande,
pointage → écran Pointages de la personne sur la semaine du pointage
(`PointagesNavigation.ouvrirSemaine(jour, personneId)` ; sans droit sur la
personne, l'utilisateur connecté).

## Communs

- `core/services/recherche-navigation.service.ts` : ouverture des résultats
  (barre et onglet).
- `shared/components/surligne` (+ `shared/utils/surlignage.ts`, testé) :
  surlignage des termes sans tenir compte de la casse ni des accents.
- `core/models/tab.model.ts` : paramètres d'URL des onglets triés et encodés
  d'une seule façon, pour qu'une recherche contenant « : , @ » n'ouvre pas deux
  onglets.
