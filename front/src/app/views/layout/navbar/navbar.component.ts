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
} from 'lucide-angular';

import { ThemeModeService } from '../../../core/services/theme-mode.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { USER_ROLE_LABELS, SEARCH_RESULT_TYPE_LABELS } from '../../../core/models/enums';
import { SearchApi } from '../../../core/api/search-api.service';
import { SearchResult } from '../../../core/models/search.model';

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

  currentTheme = 'light';

  private themeModeService = inject(ThemeModeService);
  private authStore = inject(AuthStore);
  private searchApi = inject(SearchApi);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly results = signal<SearchResult[]>([]);
  readonly searchOpen = signal(false);
  readonly typeLabels = SEARCH_RESULT_TYPE_LABELS;

  readonly user = this.authStore.currentUser;
  readonly roleLabel = computed(() => {
    const role = this.user()?.role;
    return role ? USER_ROLE_LABELS[role] : '';
  });

  ngOnInit(): void {
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

  goToResult(result: SearchResult): void {
    this.router.navigateByUrl(result.url);
    this.searchControl.setValue('');
    this.searchOpen.set(false);
  }
}