import { congesDeLaFenetre } from './conges';
import type { PointageAbsence } from './tableau-de-bord.port';

// Novembre : Paris = UTC+1. Journée 8 h – 17 h, matin 8 h – 12 h, après-midi 14 h – 17 h.
type Creneau = [string, string];
const journee = (jour: string): Creneau => [
  `${jour}T07:00:00Z`,
  `${jour}T16:00:00Z`,
];
const matin = (jour: string): Creneau => [
  `${jour}T07:00:00Z`,
  `${jour}T11:00:00Z`,
];
const apresMidi = (jour: string): Creneau => [
  `${jour}T13:00:00Z`,
  `${jour}T16:00:00Z`,
];

function absence(
  utilisateurId: string,
  type: 'CP' | 'FERIE',
  [debut, fin]: [string, string],
): PointageAbsence {
  return {
    utilisateurId,
    nom: utilisateurId.toUpperCase(),
    type,
    debut: new Date(debut),
    fin: new Date(fin),
  };
}

// Aujourd'hui : lundi 2 novembre 2026 ; fenêtre de 15 jours.
const FENETRE = {
  du: '2026-11-02',
  au: '2026-11-16',
  aujourdhui: '2026-11-02',
};

describe('congesDeLaFenetre', () => {
  it('reconstitue un congé en cours en entier, week-end compris', () => {
    const jours = ['2026-10-28', '2026-10-29', '2026-10-30'].concat(
      ['02', '03', '04', '05', '06'].map((j) => `2026-11-${j}`),
    );
    const conge = congesDeLaFenetre(
      jours.map((jour) => absence('sophie', 'CP', journee(jour))),
      FENETRE,
      8,
    )[0]!;
    expect(conge.debut).toEqual({ jour: '2026-10-28', duree: 'JOURNEE' });
    expect(conge.fin).toEqual({ jour: '2026-11-06', duree: 'JOURNEE' });
    expect(conge.nbJours).toBe(8);
    expect(conge.jours.map((j) => j.jour)).toEqual(jours.slice(3));
    expect(conge.joursAvantDebut).toBe(-5);
    expect(conge.absentAujourdhui).toBe(true);
    expect(conge.retour).toEqual({ jour: '2026-11-09', duree: 'JOURNEE' });
  });

  it('ne coupe pas un congé sur un férié pointé par la personne', () => {
    const conges = congesDeLaFenetre(
      [
        ...['09', '10', '12', '13'].map((j) =>
          absence('marc', 'CP', journee(`2026-11-${j}`)),
        ),
        absence('marc', 'FERIE', journee('2026-11-11')),
      ],
      FENETRE,
      8,
    );
    expect(conges).toHaveLength(1);
    expect(conges[0]!.nbJours).toBe(4);
    expect(conges[0]!.feries).toEqual(['2026-11-11']);
    expect(conges[0]!.joursAvantDebut).toBe(7);
    expect(conges[0]!.absentAujourdhui).toBe(false);
    expect(conges[0]!.retour.jour).toBe('2026-11-16');
  });

  it('coupe un congé sur un férié que la personne n’a pas pointé', () => {
    const conges = congesDeLaFenetre(
      ['10', '12'].map((j) => absence('marc', 'CP', journee(`2026-11-${j}`))),
      FENETRE,
      8,
    );
    expect(conges).toHaveLength(2);
  });

  it('distingue les demi-journées selon la durée et l’heure de fin', () => {
    const conges = congesDeLaFenetre(
      [
        absence('claire', 'CP', apresMidi('2026-11-05')),
        absence('claire', 'CP', matin('2026-11-13')),
      ],
      FENETRE,
      8,
    );
    expect(conges.map((c) => [c.debut.duree, c.nbJours])).toEqual([
      ['APRES_MIDI', 0.5],
      ['MATIN', 0.5],
    ]);
    // Reprise l'après-midi même après un congé du matin.
    expect(conges[1]!.retour).toEqual({
      jour: '2026-11-13',
      duree: 'APRES_MIDI',
    });
  });

  it('cumule les pointages d’une même journée', () => {
    const conge = congesDeLaFenetre(
      [
        absence('claire', 'CP', matin('2026-11-04')),
        absence('claire', 'CP', apresMidi('2026-11-04')),
      ],
      FENETRE,
      8,
    )[0]!;
    expect(conge.debut.duree).toBe('JOURNEE');
    expect(conge.nbJours).toBe(1);
  });

  it('sépare un matin et l’après-midi du lendemain (travail entre les deux)', () => {
    const conges = congesDeLaFenetre(
      [
        absence('paul', 'CP', matin('2026-11-03')),
        absence('paul', 'CP', apresMidi('2026-11-04')),
      ],
      FENETRE,
      8,
    );
    expect(conges).toHaveLength(2);
  });

  it('écarte les congés hors fenêtre et trie par premier jour puis nom', () => {
    const conges = congesDeLaFenetre(
      [
        absence('zoe', 'CP', journee('2026-11-04')),
        absence('anne', 'CP', journee('2026-11-04')),
        absence('anne', 'CP', journee('2026-11-20')),
        absence('luc', 'CP', journee('2026-10-30')),
        absence('marc', 'FERIE', journee('2026-11-11')),
      ],
      FENETRE,
      8,
    );
    expect(conges.map((c) => c.nom)).toEqual(['ANNE', 'ZOE']);
  });
});
