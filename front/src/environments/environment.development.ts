export const environment = {
  production: false,
  apiUrl: '/api/v1', // en dev, le proxy relaie /api vers http://localhost:3000
  /** Date du jour simulée (AAAA-MM-JJ) pour le bandeau de fin de mois ; null = date réelle. */
  dateDuJourSimulee: null as string | null,
};
