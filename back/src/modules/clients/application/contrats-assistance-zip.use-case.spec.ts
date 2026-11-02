import type { ContratAssistance } from '../domain/client-fiche.port';
import {
  nomFichier,
  nomUnique,
  retenus,
} from './contrats-assistance-zip.use-case';

const contrat = (
  patch: Partial<ContratAssistance> & { id: number },
): ContratAssistance => ({
  libelleContrat: 'Contrat temps',
  dateMiseEnPlace: '2024-01-01',
  dateEcheance: null,
  clientId: 1,
  clientNom: 'CLIENT',
  groupe: null,
  groupeLibelle: null,
  ...patch,
});

describe('édition groupée des contrats d’assistance', () => {
  const contrats = [
    contrat({ id: 1, clientId: 1, groupe: 'CFL' }),
    contrat({ id: 2, clientId: 2, groupe: 'CFL' }),
    contrat({ id: 3, clientId: 3 }),
    contrat({ id: 4, clientId: 3, dateMiseEnPlace: '2026-12-01' }),
    contrat({ id: 5, clientId: 3, dateEcheance: '2026-06-30' }),
  ];
  const tous = {
    arreteAu: '2026-10-31',
    groupe: null,
    clientId: null,
    contratId: null,
  };

  it('retient les contrats en cours à la date d’arrêté', () => {
    expect(retenus(contrats, tous).map((c) => c.id)).toEqual([1, 2, 3]);
  });

  it('filtre par groupe, client et contrat', () => {
    expect(
      retenus(contrats, { ...tous, groupe: 'CFL' }).map((c) => c.id),
    ).toEqual([1, 2]);
    expect(
      retenus(contrats, { ...tous, clientId: 3 }).map((c) => c.id),
    ).toEqual([3]);
    expect(
      retenus(contrats, { ...tous, contratId: 2 }).map((c) => c.id),
    ).toEqual([2]);
    expect(retenus(contrats, { ...tous, contratId: 4 })).toEqual([]);
  });

  it('nomme les fichiers « Client - Contrat.pdf » sans doublon', () => {
    const c = contrat({
      id: 9,
      clientNom: 'A/B SA',
      libelleContrat: 'Assistance : 2026',
    });
    expect(nomFichier(c)).toBe('A B SA - Assistance 2026.pdf');
    const pris = new Set<string>();
    expect(nomUnique('X - Y.pdf', pris)).toBe('X - Y.pdf');
    expect(nomUnique('X - Y.pdf', pris)).toBe('X - Y (2).pdf');
    expect(nomUnique('x - y.pdf', pris)).toBe('x - y (3).pdf');
  });
});
