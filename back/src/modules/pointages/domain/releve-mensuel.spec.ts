import type { Pointage, TypeAction } from './pointage.port';
import {
  bornesDuMois,
  construireReleve,
  libelleMois,
  statutFacturable,
} from './releve-mensuel';

const TYPES: TypeAction[] = [
  { cle: 'ASSC', libelle: 'Assistance sur contrat', couleur: '153,204,255' },
  { cle: 'AUTRE', libelle: 'Autre', couleur: '192,192,192' },
  { cle: 'CP', libelle: 'Congés payés', couleur: '154,204,230' },
];

let id = 0;
/** Pointage du 2 septembre 2026 (heures UTC) ; client CFL par défaut. */
function pointage(
  debut: string,
  fin: string,
  autres: Partial<Pointage> = {},
): Pointage {
  return {
    id: ++id,
    utilisateurId: 'u1',
    debut: new Date(`2026-09-02T${debut}:00Z`),
    fin: new Date(`2026-09-02T${fin}:00Z`),
    typeAction: 'ASSC',
    clientId: 1,
    clientCode: 'CFL',
    clientNom: 'CFL CARGO',
    commandeId: 10,
    commandeNumero: 'CORAIL',
    contactId: null,
    contactNom: null,
    description: 'Tâche',
    facturable: 0,
    tempsFacturable: null,
    ...autres,
  };
}

describe('relevé mensuel', () => {
  const { du, au } = bornesDuMois(2026, 9);

  it('borne le mois à minuit, heure de Paris', () => {
    expect(du.toISOString()).toBe('2026-08-31T22:00:00.000Z');
    expect(au.toISOString()).toBe('2026-09-30T22:00:00.000Z');
    expect(bornesDuMois(2026, 12).au.toISOString()).toBe(
      '2026-12-31T23:00:00.000Z',
    );
    expect(libelleMois(2026, 9)).toBe('Septembre 2026');
  });

  it('classe les codes facturables', () => {
    expect([0, 1, 2, 3, 4].map(statutFacturable)).toEqual([
      'non',
      'oui',
      'attente',
      'attente',
      'attente',
    ]);
  });

  it('cumule par description et statut, trie comme l’ancien relevé', () => {
    const releve = construireReleve(
      [
        pointage('07:00', '08:00', { description: '[DOTF] Ticket 1' }),
        pointage('08:00', '08:15', { description: 'COPRO du 02/09' }),
        pointage('09:00', '09:30', { description: '[DOTF] Ticket 1' }),
        pointage('10:00', '10:30', {
          description: '[DOTF] Ticket 1',
          facturable: 1,
        }),
      ],
      TYPES,
      du,
      au,
    );

    const lignes = releve.groupes[0]!.types[0]!.commandes[0]!.lignes;
    expect(lignes).toEqual([
      { description: 'COPRO du 02/09', heures: 0.25, facturable: 'non' },
      { description: '[DOTF] Ticket 1', heures: 0.5, facturable: 'oui' },
      { description: '[DOTF] Ticket 1', heures: 1.5, facturable: 'non' },
    ]);
    expect(releve.groupes[0]!.heures).toBe(2.25);
  });

  it('regroupe le temps sans client sous INTERNE et compte les absences à part', () => {
    const sansClient = {
      clientId: null,
      clientCode: null,
      clientNom: null,
      commandeId: null,
      commandeNumero: null,
    };
    const releve = construireReleve(
      [
        pointage('07:00', '09:00'),
        pointage('09:00', '10:00', { ...sansClient, typeAction: 'AUTRE' }),
        pointage('12:00', '16:00', { ...sansClient, typeAction: 'CP' }),
      ],
      TYPES,
      du,
      au,
    );

    expect(releve.groupes.map((g) => g.client)).toEqual(['CFL', 'INTERNE']);
    expect(releve.groupes[1]!.types.map((t) => t.libelle)).toEqual([
      'Autre',
      'Congés payés',
    ]);
    expect(releve.groupes[1]!.types[0]!.commandes[0]!.numero).toBeNull();
    expect(releve).toMatchObject({
      total: 7,
      clients: 2,
      interne: 1,
      absences: 4,
    });
  });

  it('ne retient que les pointages commençant dans le mois', () => {
    const veille = pointage('07:00', '08:00');
    veille.debut = new Date('2026-08-31T21:00:00Z');
    veille.fin = new Date('2026-08-31T23:00:00Z');
    expect(construireReleve([veille], TYPES, du, au).groupes).toEqual([]);
  });

  it('garde la clé du type d’action inconnu du paramétrage', () => {
    const releve = construireReleve(
      [pointage('07:00', '08:00', { typeAction: 'VIEUX' })],
      TYPES,
      du,
      au,
    );
    expect(releve.groupes[0]!.types[0]).toMatchObject({
      libelle: 'VIEUX',
      couleur: null,
    });
  });
});
