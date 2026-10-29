import { Component, DestroyRef, OnInit, inject, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';

/** En-tête de liste : recherche debouncée + emplacements de filtres + bouton export. */
@Component({
  selector: 'app-list-toolbar',
  imports: [ReactiveFormsModule],
  templateUrl: './list-toolbar.component.html',
})
export class ListToolbarComponent implements OnInit {
  readonly placeholder = input('Rechercher…');
  readonly showExport = input(false);
  readonly searchChange = output<string>();
  readonly exportClick = output<void>();

  readonly search = new FormControl('', { nonNullable: true });
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchChange.emit(value.trim()));
  }
}
