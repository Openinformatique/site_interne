# Module recherche (back)

Recherche globale de la barre du haut et de l'onglet « Recherche : terme ».
Lecture seule, à partir des tables `clients`, `commandes`, `client_contrats`
et `pointages`.

## API

### `GET /api/v1/recherche?q=…&limite=…`

Clients, commandes et pointages contenant **chacun des mots** de `q` (8 au
plus, 2 caractères au moins hors espaces ; sinon réponse vide), sans tenir
compte de la casse ni des accents (collation `Latin1_General_CI_AI`) ; jokers
LIKE neutralisés. `limite` : résultats renvoyés par catégorie (1 à 200,
5 par défaut) ; les totaux portent sur tous les résultats.

| Catégorie | Texte recherché                                                                                     | Ordre                                                |
| --------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Clients   | code, raison sociale, adresses 1 à 3, code postal, ville, pays (code et libellé), n° de TVA, groupe | actifs d'abord, puis raison sociale                  |
| Commandes | n° de commande, n° de devis, libellé, client (code, raison sociale), contrat                        | en cours d'abord, puis date de commande décroissante |
| Pointages | description (tags compris), client (code, raison sociale), commande (n° de commande ou de devis)    | du plus récent au plus ancien                        |

- Mêmes champs que les recherches des listes des clients et des commandes
  (montant exclu) ; clients et commandes supprimés exclus.
- **Pointages** : mêmes droits que le planning — les siens ; ceux de toute
  l'équipe pour Admin et Direction. `heures` = total des durées (fin − début)
  de tous les pointages trouvés ; `jour` = jour du pointage à Paris.
- Réponse : `termes` (mots retenus), `clients`, `commandes`, `pointages`
  (`total`, `items`, et `heures` pour les pointages).

## Organisation

| Couche         | Fichier                                           |
| -------------- | ------------------------------------------------- |
| domain         | `recherche.port.ts`                               |
| application    | `recherche.use-case.ts` (mots, limite, droits)    |
| infrastructure | `typeorm-recherche.repository.ts` (requêtes)      |
| presentation   | `recherche.controller.ts`, `dto/recherche.dto.ts` |

Tests : `recherche.use-case.spec.ts`. Les requêtes ont été vérifiées sur la
base locale (moins d'une seconde pour « corail » : 56 commandes, 7 484
pointages).
