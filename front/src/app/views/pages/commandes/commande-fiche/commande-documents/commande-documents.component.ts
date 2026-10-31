import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Download, File as FileIcon, Image, LucideAngularModule, Trash2, Upload } from 'lucide-angular';
import { catchError, of } from 'rxjs';
import Swal from 'sweetalert2';

import { CommandesApi } from '../../../../../core/api/commandes-api.service';
import { ParametresApi } from '../../../../../core/api/parametres-api.service';
import { ApiError } from '../../../../../core/models/api.model';
import { ParametreValue } from '../../../../../core/models/client.model';
import { CommandeDocument } from '../../../../../core/models/commande.model';
import { UiVisibleDirective } from '../../../../../core/ui-access/ui-visible.directive';
import { saveBlob } from '../../../../../shared/utils/file-download';
import { COMMANDES_UI_KEYS } from '../../access/commandes-access.keys';
import { fichierFormat, FichierFormat, formatTaille, ouvrableDansNavigateur } from '../commande-fiche.utils';

/** Taille maximale d'un document (identique à STORAGE_MAX_FILE_SIZE du back). */
const TAILLE_MAX = 20 * 1024 * 1024;

/**
 * Encart « Documents » de la fiche commande : dépôt d'un fichier (type de
 * document obligatoire, commentaire facultatif), vignettes, ouverture,
 * téléchargement et suppression. Ajout et suppression sont immédiats.
 */
@Component({
  selector: 'app-commande-documents',
  imports: [LucideAngularModule, UiVisibleDirective],
  templateUrl: './commande-documents.component.html',
  styleUrl: './commande-documents.component.scss',
})
export class CommandeDocumentsComponent {
  private readonly commandesApi = inject(CommandesApi);
  private readonly parametresApi = inject(ParametresApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly commandeId = input.required<number>();

  readonly UiKeys = COMMANDES_UI_KEYS;
  readonly icons = { Download, FileIcon, Image, Trash2, Upload };
  readonly formatTaille = formatTaille;

  readonly documents = signal<CommandeDocument[]>([]);
  readonly loaded = signal(false);
  readonly types = signal<ParametreValue[]>([]);
  /** Aperçus des images (URL locales des fichiers téléchargés), par document. */
  readonly apercus = signal<Record<number, string>>({});

  // Fichier choisi, en attente du type et du commentaire.
  readonly pending = signal<File | null>(null);
  readonly pendingType = signal('');
  readonly pendingComment = signal('');
  readonly pendingError = signal<string | null>(null);
  readonly uploading = signal(false);
  readonly dragOver = signal(false);

  readonly pendingFormat = computed(() => {
    const file = this.pending();
    return file ? fichierFormat(file.type, file.name) : null;
  });

  constructor() {
    this.parametresApi.values('TDOC').pipe(catchError(() => of([]))).subscribe((values) => this.types.set(values));
    effect(() => {
      const id = this.commandeId();
      untracked(() => this.load(id));
    });
    this.destroyRef.onDestroy(() => Object.values(this.apercus()).forEach((url) => URL.revokeObjectURL(url)));
  }

  /** Date d'ajout (JJ/MM/AAAA, heure locale). */
  dateAjout(document: CommandeDocument): string {
    const date = new Date(document.createdAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }

  format(document: CommandeDocument): FichierFormat {
    return fichierFormat(document.typeMime, document.nomFichier);
  }

  // --- Choix du fichier ------------------------------------------------------

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.choose(input.files?.[0] ?? null);
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    this.choose(event.dataTransfer?.files?.[0] ?? null);
  }

  private choose(file: File | null): void {
    if (!file) {
      return;
    }
    this.pending.set(file);
    this.pendingType.set('');
    this.pendingComment.set('');
    this.pendingError.set(file.size > TAILLE_MAX ? 'Fichier trop volumineux (20 Mo maximum).' : null);
  }

  cancelPending(): void {
    this.pending.set(null);
    this.pendingError.set(null);
  }

  setPendingType(event: Event): void {
    this.pendingType.set((event.target as HTMLSelectElement).value);
    this.pendingError.set(null);
  }

  setPendingComment(event: Event): void {
    this.pendingComment.set((event.target as HTMLInputElement).value);
  }

  addPending(): void {
    const file = this.pending();
    if (!file || this.uploading()) {
      return;
    }
    if (!this.pendingType()) {
      this.pendingError.set('Choisissez le type de document.');
      return;
    }
    if (file.size > TAILLE_MAX) {
      return;
    }
    this.uploading.set(true);
    this.commandesApi.addDocument(this.commandeId(), file, this.pendingType(), this.pendingComment().trim() || null).subscribe({
      next: (document) => {
        this.uploading.set(false);
        this.pending.set(null);
        this.documents.update((documents) => [document, ...documents]);
        this.loadApercu(document);
        this.showToast('Document ajouté.');
      },
      error: (error: HttpErrorResponse) => {
        this.uploading.set(false);
        const apiError = (error.error as { error?: ApiError } | null)?.error;
        this.pendingError.set(apiError?.details?.[0]?.message ?? apiError?.message ?? "Le document n'a pas pu être ajouté.");
      },
    });
  }

  // --- Ouverture, téléchargement, suppression --------------------------------

  /** PDF et images : ouverts dans un nouvel onglet ; autres formats : téléchargés. */
  open(document: CommandeDocument): void {
    if (!ouvrableDansNavigateur(document.typeMime)) {
      this.download(document);
      return;
    }
    // Onglet ouvert pendant le clic (sinon bloqué par le navigateur), rempli à réception.
    const tab = window.open('', '_blank');
    this.commandesApi.documentFile(this.commandeId(), document.id).subscribe({
      next: ({ blob }) => {
        const url = URL.createObjectURL(new Blob([blob], { type: document.typeMime }));
        if (tab) {
          tab.location.href = url;
        } else {
          window.open(url, '_blank');
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => tab?.close(),
    });
  }

  download(document: CommandeDocument): void {
    this.commandesApi
      .documentFile(this.commandeId(), document.id)
      .subscribe(({ blob, filename }) => saveBlob(blob, filename || document.nomFichier || `document-${document.id}`));
  }

  async remove(document: CommandeDocument): Promise<void> {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Supprimer le document ?',
      text: `« ${document.nomFichier ?? 'Document'} » sera définitivement supprimé.`,
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      reverseButtons: true,
      customClass: { confirmButton: 'swal-confirm-danger' },
    });
    if (!result.isConfirmed) {
      return;
    }
    this.commandesApi.deleteDocument(this.commandeId(), document.id).subscribe(() => {
      this.documents.update((documents) => documents.filter((candidate) => candidate.id !== document.id));
      const url = this.apercus()[document.id];
      if (url) {
        URL.revokeObjectURL(url);
      }
      this.showToast('Document supprimé.');
    });
  }

  // --- Chargement ------------------------------------------------------------

  private load(id: number): void {
    this.commandesApi
      .documents(id)
      .pipe(catchError(() => of([] as CommandeDocument[])))
      .subscribe((documents) => {
        this.documents.set(documents);
        this.loaded.set(true);
        documents.forEach((document) => this.loadApercu(document));
      });
  }

  /** Aperçu réel des images (fichier récupéré avec l'authentification). */
  private loadApercu(document: CommandeDocument): void {
    if (this.format(document).famille !== 'image' || !ouvrableDansNavigateur(document.typeMime)) {
      return;
    }
    this.commandesApi
      .documentFile(this.commandeId(), document.id)
      .pipe(catchError(() => of(null)))
      .subscribe((file) => {
        if (file) {
          const url = URL.createObjectURL(file.blob);
          this.apercus.update((apercus) => ({ ...apercus, [document.id]: url }));
        }
      });
  }

  private showToast(title: string): void {
    void Swal.fire({
      toast: true,
      position: 'bottom-end',
      title,
      showConfirmButton: false,
      timer: 2600,
      customClass: { popup: 'fiche-toast' },
    });
  }
}
