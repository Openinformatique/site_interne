import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Building2, CalendarClock, ClipboardList, LucideAngularModule, SearchIcon } from 'lucide-angular';
import { of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';

import { RechercheApi } from '../../../core/api/recherche-api.service';
import { ClientTrouve, CommandeTrouvee, PointageTrouve, ResultatRecherche } from '../../../core/models/recherche.model';
import { RechercheNavigation, numeroCommande } from '../../../core/services/recherche-navigation.service';
import { SurligneComponent } from '../../../shared/components/surligne/surligne.component';

/** Résultats par groupe dans la liste déroulante. */
const PAR_GROUPE = 4;
/** Longueur minimale (caractères, espaces exclus) avant de chercher. */
const LONGUEUR_MIN = 2;

type Element =
  | { type: 'client'; client: ClientTrouve }
  | { type: 'commande'; commande: CommandeTrouvee }
  | { type: 'pointage'; pointage: PointageTrouve };

/**
 * Recherche globale de la barre du haut : clients, commandes et pointages
 * contenant le texte saisi, en liste déroulante groupée (4 par groupe) ;
 * Entrée ouvre l'onglet de tous les résultats. Flèches haut / bas pour
 * choisir un résultat, Échap pour fermer. Maquette validée le 02/11/2026.
 */
@Component({
  selector: 'app-recherche-globale',
  imports: [ReactiveFormsModule, LucideAngularModule, SurligneComponent],
  templateUrl: './recherche-globale.component.html',
  styleUrl: './recherche-globale.component.scss',
})
export class RechercheGlobaleComponent {
  private readonly api = inject(RechercheApi);
  private readonly navigation = inject(RechercheNavigation);

  readonly icons = { search: SearchIcon, clients: Building2, commandes: ClipboardList, pointages: CalendarClock };
  readonly numeroCommande = numeroCommande;

  readonly saisie = new FormControl('', { nonNullable: true });
  readonly resultat = signal<ResultatRecherche | null>(null);
  readonly ouvert = signal(false);
  /** Index du résultat choisi au clavier (-1 : aucun). */
  readonly selection = signal(-1);

  /** Résultats affichés, dans l'ordre de la liste (navigation au clavier). */
  readonly elements = computed<Element[]>(() => {
    const r = this.resultat();
    if (!r) {
      return [];
    }
    return [
      ...r.clients.items.map((client) => ({ type: 'client' as const, client })),
      ...r.commandes.items.map((commande) => ({ type: 'commande' as const, commande })),
      ...r.pointages.items.map((pointage) => ({ type: 'pointage' as const, pointage })),
    ];
  });
  readonly aucun = computed(() => {
    const r = this.resultat();
    return !!r && r.clients.total + r.commandes.total + r.pointages.total === 0;
  });

  constructor() {
    this.saisie.valueChanges
      .pipe(
        map((q) => q.trim()),
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) =>
          q.replace(/\s/g, '').length >= LONGUEUR_MIN
            ? this.api.rechercher(q, PAR_GROUPE).pipe(catchError(() => of(null)))
            : of(null),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((resultat) => {
        this.resultat.set(resultat);
        this.selection.set(-1);
        this.ouvert.set(resultat !== null);
      });
  }

  /** Position d'un résultat dans la liste (sélection au clavier). */
  index(element: ClientTrouve | CommandeTrouvee | PointageTrouve): number {
    return this.elements().findIndex((e) => (e.type === 'client' ? e.client : e.type === 'commande' ? e.commande : e.pointage) === element);
  }

  clavier(event: KeyboardEvent): void {
    const nombre = this.elements().length;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        if (!this.ouvert() || nombre === 0) {
          return;
        }
        event.preventDefault();
        this.selection.update((i) => (event.key === 'ArrowDown' ? (i + 1) % nombre : (i - 1 + nombre) % nombre));
        break;
      case 'Enter': {
        event.preventDefault();
        const choisi = this.elements()[this.selection()];
        if (this.ouvert() && choisi) {
          this.ouvrir(choisi);
        } else {
          this.toutVoir();
        }
        break;
      }
      case 'Escape':
        this.ouvert.set(false);
        break;
    }
  }

  ouvrir(element: Element): void {
    if (element.type === 'client') {
      this.navigation.ouvrirClient(element.client);
    } else if (element.type === 'commande') {
      this.navigation.ouvrirCommande(element.commande);
    } else {
      this.navigation.ouvrirPointage(element.pointage);
    }
    this.fermer();
  }

  /** Onglet de tous les résultats pour le texte saisi. */
  toutVoir(): void {
    const q = this.saisie.value.trim();
    if (q.replace(/\s/g, '').length < LONGUEUR_MIN) {
      return;
    }
    this.navigation.ouvrirResultats(q);
    this.fermer();
  }

  rouvrir(): void {
    this.ouvert.set(this.resultat() !== null);
  }

  fermer(): void {
    this.ouvert.set(false);
    this.selection.set(-1);
  }

  heures(value: number): string {
    return `${value.toFixed(2).replace('.', ',')} h`;
  }

  jour(iso: string): string {
    return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  }

  /** « 52 commandes », « 1 client ». */
  pluriel(nombre: number, singulier: string, pluriel: string): string {
    return `${nombre.toLocaleString('fr-FR')} ${nombre > 1 ? pluriel : singulier}`;
  }
}
