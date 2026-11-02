import { ContratAssistance } from '../../../../core/models/client.model';
import { clientsAvecContrat, contratsRetenus, groupesAvecContrat, libelleCompteur } from './edition-contrats.utils';

const contrat = (patch: Partial<ContratAssistance> & { id: number }): ContratAssistance => ({
  libelleContrat: 'Contrat temps',
  dateMiseEnPlace: '2024-01-01',
  dateEcheance: null,
  clientId: 1,
  clientNom: 'CLIENT',
  groupe: null,
  groupeLibelle: null,
  ...patch,
});

describe('édition des contrats d’assistance', () => {
  const contrats = [
    contrat({ id: 1, clientId: 1, clientNom: 'CFL CARGO', groupe: 'CFL', groupeLibelle: 'Groupe CFL' }),
    contrat({ id: 2, clientId: 2, clientNom: 'CFL TERMINALS', groupe: 'CFL', groupeLibelle: 'Groupe CFL' }),
    contrat({ id: 3, clientId: 3, clientNom: 'ATRADIUS' }),
    contrat({ id: 4, clientId: 3, clientNom: 'ATRADIUS', dateMiseEnPlace: '2026-12-01' }),
    contrat({ id: 5, clientId: 3, clientNom: 'ATRADIUS', dateEcheance: '2026-06-30' }),
  ];
  const tous = { arreteAu: '2026-10-31', groupe: null, clientId: null, contratId: null };

  it('compte les contrats en cours retenus par les filtres', () => {
    expect(contratsRetenus(contrats, tous).map((c) => c.id)).toEqual([1, 2, 3]);
    expect(contratsRetenus(contrats, { ...tous, groupe: 'CFL' }).map((c) => c.id)).toEqual([1, 2]);
    expect(contratsRetenus(contrats, { ...tous, clientId: 3, contratId: 4 })).toEqual([]);
    expect(contratsRetenus(contrats, { ...tous, arreteAu: '' })).toEqual([]);
  });

  it('propose les groupes et clients ayant un contrat (cascade)', () => {
    expect(groupesAvecContrat(contrats)).toEqual([{ cle: 'CFL', libelle: 'Groupe CFL' }]);
    expect(clientsAvecContrat(contrats, null).map((c) => c.nom)).toEqual(['ATRADIUS', 'CFL CARGO', 'CFL TERMINALS']);
    expect(clientsAvecContrat(contrats, 'CFL').map((c) => c.id)).toEqual([1, 2]);
  });

  it('libellé du compteur', () => {
    expect(libelleCompteur(7, '2026-10-31')).toBe('7 contrats seront édités (un PDF chacun), arrêtés au 31/10/2026.');
    expect(libelleCompteur(1, '2026-10-31')).toBe('1 contrat sera édité, arrêté au 31/10/2026.');
    expect(libelleCompteur(0, '2026-10-31')).toBe('Aucun contrat ne correspond à ces critères.');
    expect(libelleCompteur(3, '')).toBe("Indiquez la date d'arrêté.");
  });
});
