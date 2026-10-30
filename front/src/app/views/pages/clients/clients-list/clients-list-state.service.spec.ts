import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ClientsListStateService, DEFAULT_CLIENTS_LIST_STATE } from './clients-list-state.service';

describe('ClientsListStateService', () => {
  const currentUser = signal<object | null>({ id: 'u1' });
  let service: ClientsListStateService;

  beforeEach(() => {
    currentUser.set({ id: 'u1' });
    TestBed.configureTestingModule({
      providers: [{ provide: AuthStore, useValue: { currentUser } }],
    });
    service = TestBed.inject(ClientsListStateService);
    TestBed.tick();
  });

  it('démarre sur les valeurs par défaut (actifs, tri par raison sociale, 50 par page)', () => {
    expect(service.state()).toEqual(DEFAULT_CLIENTS_LIST_STATE);
  });

  it('revient en page 1 quand un filtre change', () => {
    service.update({ page: 3 });
    service.update({ includeInactive: true });
    expect(service.state().page).toBe(1);
    expect(service.state().includeInactive).toBe(true);
  });

  it('revient en page 1 quand la taille de page change', () => {
    service.update({ page: 4 });
    service.update({ pageSize: 100 });
    expect(service.state().page).toBe(1);
    expect(service.state().pageSize).toBe(100);
  });

  it('garde les filtres lors d\'un simple changement de page', () => {
    service.update({ search: 'metz', groupes: ['CFL'] });
    service.update({ page: 2 });
    expect(service.state()).toMatchObject({ search: 'metz', groupes: ['CFL'], page: 2 });
  });

  it('remet tout à zéro à la déconnexion', () => {
    service.update({ search: 'metz', includeInactive: true, page: 2 });
    currentUser.set(null);
    TestBed.tick();
    expect(service.state()).toEqual(DEFAULT_CLIENTS_LIST_STATE);
  });
});
