/**
 * Types miroir du contrat HTTP du back (enveloppe standard).
 * Le back répond TOUJOURS via cette enveloppe ; ApiClient la déplie
 * pour ne rendre aux composants que `data` (et la pagination pour les listes).
 */

/** Métadonnées présentes sur toute réponse de succès. */
export interface ApiMeta {
  requestId: string;
  timestamp: string;
  pagination?: PaginationMeta; // présent uniquement pour les listes paginées
}

/** Enveloppe de succès : { success:true, data, meta }. */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta: ApiMeta;
}

/** Bloc de pagination renvoyé par le back (dans meta.pagination). */
export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Forme « dépliée » d'une liste paginée, telle que la voient les composants. */
export interface Page<T> {
  items: T[];
  pagination: PaginationMeta;
}

/** Corps d'erreur du back : error.error dans l'objet HttpErrorResponse. */
export interface ApiError {
  code: string; // ex. VALIDATION_ERROR, BUSINESS_RULE_VIOLATION, ACCESS_DENIED…
  message: string; // message français, affichable tel quel
  details?: { field: string; message: string }[]; // erreurs de validation par champ
}
