import {
  contratEnCours,
  debutDuSuivi,
  mouvementArrete,
  nomDemandeur,
  pointageDansLeSuivi,
} from './contrat-suivi';

describe('suivi de contrat', () => {
  it('commence à la première commande datée', () => {
    expect(debutDuSuivi(['2025-04-10', null, '2024-05-01'])).toBe('2024-05-01');
    expect(debutDuSuivi([null])).toBeNull();
    expect(debutDuSuivi([])).toBeNull();
  });

  it('écarte les pointages antérieurs à la première commande', () => {
    expect(pointageDansLeSuivi('2024-04-30', '2024-05-01')).toBe(false);
    expect(pointageDansLeSuivi('2024-05-01', '2024-05-01')).toBe(true);
    expect(pointageDansLeSuivi('2023-01-01', null)).toBe(true);
    expect(pointageDansLeSuivi(null, '2024-05-01')).toBe(false);
  });

  it('arrête le suivi à une date incluse', () => {
    expect(mouvementArrete('2026-10-31', '2026-10-31')).toBe(true);
    expect(mouvementArrete('2026-11-01', '2026-10-31')).toBe(false);
    expect(mouvementArrete('2030-01-01', null)).toBe(true);
    expect(mouvementArrete(null, '2026-10-31')).toBe(false);
  });

  it('retient les contrats en cours à la date', () => {
    const contrat = (
      dateMiseEnPlace: string | null,
      dateEcheance: string | null,
    ) => ({ dateMiseEnPlace, dateEcheance });
    expect(contratEnCours(contrat('2024-05-01', null), '2026-10-31')).toBe(
      true,
    );
    expect(contratEnCours(contrat('2026-12-01', null), '2026-10-31')).toBe(
      false,
    );
    expect(
      contratEnCours(contrat('2024-05-01', '2026-10-31'), '2026-10-31'),
    ).toBe(true);
    expect(
      contratEnCours(contrat('2024-05-01', '2026-06-30'), '2026-10-31'),
    ).toBe(false);
    expect(contratEnCours(contrat(null, null), '2026-10-31')).toBe(false);
  });

  it('affiche le contact « NOM Prénom »', () => {
    expect(nomDemandeur('ECHASSOUX,Franck')).toBe('ECHASSOUX Franck');
    expect(nomDemandeur('DUPONT')).toBe('DUPONT');
    expect(nomDemandeur(null)).toBeNull();
  });
});
