import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import {
  LucideAngularModule,
  SearchIcon,
  SunIcon,
  MoonIcon,
  UserIcon,
  MonitorIcon,
  LogOutIcon,
  TextAlignJustifyIcon,
  BellIcon,
  CalendarXIcon,
  CheckIcon,
  ClockIcon,
} from 'lucide-angular';

import { ThemeModeService } from '../../../core/services/theme-mode.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { USER_ROLE_LABELS, SEARCH_RESULT_TYPE_LABELS } from '../../../core/models/enums';
import { SearchApi } from '../../../core/api/search-api.service';
import { SearchResult } from '../../../core/models/search.model';
import { AlertesPointageStore } from '../../../core/services/alertes-pointage.store';
import { PointagesNavigation } from '../../../core/services/pointages-navigation.service';
import { JourIncomplet } from '../../../core/models/pointage.model';

@Component({
  selector: 'app-navbar',
  imports: [NgbDropdownModule, RouterLink, LucideAngularModule, ReactiveFormsModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit {
  readonly searchIcon = SearchIcon;
  readonly sunIcon = SunIcon;
  readonly moonIcon = MoonIcon;
  readonly userIcon = UserIcon;
  readonly monitorIcon = MonitorIcon;
  readonly logOutIcon = LogOutIcon;
  readonly textAlignJustifyIcon = TextAlignJustifyIcon;
  readonly bellIcon = BellIcon;
  readonly calendarXIcon = CalendarXIcon;
  readonly checkIcon = CheckIcon;
  readonly clockIcon = ClockIcon;

  currentTheme = 'light';

  private themeModeService = inject(ThemeModeService);
  private authStore = inject(AuthStore);
  private searchApi = inject(SearchApi);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private pointagesNavigation = inject(PointagesNavigation);
  readonly alertesStore = inject(AlertesPointageStore);

  /** Jours ouvrés incomplets de l'utilisateur connecté (cloche). */
  readonly alertes = this.alertesStore.alertes;
  readonly alertesLabel = computed(() => {
    const nombre = this.alertes().length;
    const s = nombre > 1 ? 's' : '';
    return nombre ? `Alertes : ${nombre} jour${s} de pointage incomplet${s}` : 'Alertes : pointages à jour';
  });

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly results = signal<SearchResult[]>([]);
  readonly searchOpen = signal(false);
  readonly typeLabels = SEARCH_RESULT_TYPE_LABELS;

  readonly user = this.authStore.currentUser;
  readonly roleLabel = computed(() => {
    const role = this.user()?.role;
    return role ? USER_ROLE_LABELS[role] : '';
  });
  /**
   * Initiales de la pastille de profil : le nom affiché s'il est déjà court
   * (trigramme repris de l'ancienne application, ex. « JV »), sinon la
   * première lettre des deux premiers mots (« Administrateur local » → « AL »).
   */
  readonly initiales = computed(() => {
    const nom = (this.user()?.displayName ?? '').trim();
    if (!nom) {
      return '?';
    }
    const mots = nom.split(/[\s.\-_']+/).filter(Boolean);
    if (mots.length === 1 && nom.length <= 3) {
      return nom.toUpperCase();
    }
    return mots.slice(0, 2).map((mot) => mot[0]).join('').toUpperCase();
  });

  ngOnInit(): void {
    this.alertesStore.demarrer(this.destroyRef);

    this.themeModeService.currentTheme.subscribe((theme) => {
      this.currentTheme = theme;
      this.showActiveTheme(this.currentTheme);
    });

    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => (q.trim().length >= 2 ? this.searchApi.search(q.trim()) : of(null))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        const flat = res ? (Object.values(res.results) as SearchResult[][]).flat() : [];
        this.results.set(flat);
        this.searchOpen.set(flat.length > 0);
      });
  }

  showActiveTheme(theme: string) {
    const themeSwitcher = document.querySelector('#theme-switcher') as HTMLInputElement;
    const box = document.querySelector('.box') as HTMLElement;
    if (!themeSwitcher) return;
    if (theme === 'dark') {
      themeSwitcher.checked = true;
      box.classList.remove('light');
      box.classList.add('dark');
    } else if (theme === 'light') {
      themeSwitcher.checked = false;
      box.classList.remove('dark');
      box.classList.add('light');
    }
  }

  onThemeCheckboxChange(e: Event) {
    const checkbox = e.target as HTMLInputElement;
    const newTheme = checkbox.checked ? 'dark' : 'light';
    this.themeModeService.toggleTheme(newTheme);
    this.showActiveTheme(newTheme);
  }

  toggleSidebar(e: Event) {
    e.preventDefault();
    document.body.classList.add('sidebar-open');
    document.querySelector('.sidebar .sidebar-toggler')?.classList.add('active');
  }

  onLogout(e: Event) {
    e.preventDefault();
    this.authStore.logout();
  }

  // --- Alertes (cloche) ------------------------------------------------------

  /** Ouvre les pointages de l'utilisateur connecté sur la semaine du jour incomplet. */
  ouvrirAlerte(alerte: JourIncomplet): void {
    const [annee, mois, jour] = alerte.jour.split('-').map(Number);
    this.pointagesNavigation.ouvrirSemaine(new Date(annee!, mois! - 1, jour!));
  }

  /** « Vendredi 30 octobre 2026 ». */
  dateLongue(iso: string): string {
    const [annee, mois, jour] = iso.split('-').map(Number);
    const texte = new Date(annee!, mois! - 1, jour!).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return texte.charAt(0).toUpperCase() + texte.slice(1);
  }

  heures(value: number): string {
    return `${value.toFixed(2).replace('.', ',')} h`;
  }

  anciennete(jours: number): string {
    return jours === 1 ? 'hier' : `il y a ${jours} jours`;
  }

  goToResult(result: SearchResult): void {
    this.router.navigateByUrl(result.url);
    this.searchControl.setValue('');
    this.searchOpen.set(false);
  }
}