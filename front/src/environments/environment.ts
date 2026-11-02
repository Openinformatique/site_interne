export const environment = {
  production: true,
  apiUrl: '/api/v1', // même host que le front en prod (servi derrière un reverse-proxy)
  /** Date du jour simulée (développement uniquement) ; toujours null en production. */
  dateDuJourSimulee: null as string | null,
};
