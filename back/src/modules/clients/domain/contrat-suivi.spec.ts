import {
  debutDuSuivi,
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

  it('affiche le contact « NOM Prénom »', () => {
    expect(nomDemandeur('ECHASSOUX,Franck')).toBe('ECHASSOUX Franck');
    expect(nomDemandeur('DUPONT')).toBe('DUPONT');
    expect(nomDemandeur(null)).toBeNull();
  });
});
