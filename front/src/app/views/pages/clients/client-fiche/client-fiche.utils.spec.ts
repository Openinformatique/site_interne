import { ContratMouvement } from '../../../../core/models/client.model';
import { formatHeures, formatJours, frDate, initiales, mouvementsSynthetiques, totaux } from './client-fiche.utils';

const commande = (date: string, credit: number): ContratMouvement => ({
  type: 'COMMANDE', date, libelle: `C ${date}`, utilisateur: null, credit, debit: 0,
});
const pointage = (date: string, debit: number): ContratMouvement => ({
  type: 'POINTAGE', date, libelle: `P ${date}`, utilisateur: 'JV', credit: 0, debit,
});

describe('client-fiche.utils', () => {
  it('formate dates, heures et jours à la française', () => {
    expect(frDate('2026-10-30')).toBe('30/10/2026');
    expect(frDate(null)).toBe('—');
    expect(formatHeures(35.6666)).toBe('35,67 h');
    expect(formatJours(0.375)).toBe('0,375');
    expect(formatJours(12.33333)).toBe('12,333');
  });

  it('calcule les initiales de la raison sociale', () => {
    expect(initiales('CARGO RAIL LUXEMBOURG S.A.')).toBe('CR');
    expect(initiales('')).toBe('+');
  });

  it('regroupe les pointages consécutifs en une ligne « Développement » sans date', () => {
    const rows = mouvementsSynthetiques([
      pointage('2026-10-28', 6),
      pointage('2026-10-27', 3.75),
      commande('2026-10-14', 240),
      pointage('2026-10-09', 5.5),
    ]);

    expect(rows.map((row) => [row.kind, row.date, row.debit, row.sub])).toEqual([
      ['Pointages', null, 9.75, '2 pointages'],
      ['Commande', '2026-10-14', 0, null],
      ['Pointages', null, 5.5, '1 pointage'],
    ]);
  });

  it('totalise crédit, débit et restant', () => {
    expect(totaux([commande('2026-01-01', 240), pointage('2026-02-01', 250)])).toEqual({ credit: 240, debit: 250, restant: -10 });
  });
});
