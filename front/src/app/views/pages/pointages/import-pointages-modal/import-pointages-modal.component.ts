import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CircleAlert, CircleCheck, FileSpreadsheet, LucideAngularModule, Upload, X } from 'lucide-angular';
import { Observable } from 'rxjs';

import { PointagesApi } from '../../../../core/api/pointages-api.service';
import { PointageImporte, ResultatImport } from '../../../../core/models/pointage.model';

/** Colonnes attendues (en-têtes de la ligne 1) : rappel affiché avant le choix du fichier. */
const COLONNES = [
  { lettre: 'A', entete: 'Client', aide: 'code ; vide = interne' },
  { lettre: 'B', entete: 'Type de tâche', aide: 'ASSC, COM…' },
  { lettre: 'C', entete: 'Thème', aide: 'tags paramétrés ou libres' },
  { lettre: 'D', entete: 'Devis', aide: 'n° de commande' },
  { lettre: 'E', entete: 'Date', aide: '' },
  { lettre: 'F', entete: 'Durée', aide: 'heures' },
  { lettre: 'G', entete: 'Observations', aide: '' },
  { lettre: 'H', entete: 'Contact', aide: 'NOM Prénom' },
];

/** Résultat de la fenêtre : pointages créés et premier jour importé (semaine à afficher). */
export interface ImportPointagesResultat {
  importes: number;
  premierJour: string;
}

/** Ouvre la fenêtre d'import pour la personne affichée ; résout au résultat (null si fermée sans import). */
export function ouvrirImportPointages(modal: NgbModal, personneId: string, personneNom: string): Promise<ImportPointagesResultat | null> {
  const ref = modal.open(ImportPointagesModalComponent, {
    backdropClass: 'fiche-modal-backdrop',
    modalDialogClass: 'fiche-modal fiche-modal-import',
    animation: true,
  });
  const instance = ref.componentInstance as ImportPointagesModalComponent;
  instance.personneId.set(personneId);
  instance.personneNom.set(personneNom);
  return ref.result.then((resultat: ImportPointagesResultat | undefined) => resultat ?? null).catch(() => null);
}

interface JourApercu {
  jour: string;
  libelle: string;
  heures: number;
  pointages: PointageImporte[];
}

/**
 * Fenêtre « Importer des pointages » (écran Pointages) : choix du classeur,
 * contrôle (format des colonnes, lignes, références) puis aperçu à confirmer,
 * ou liste des erreurs. Rien n'est créé tant que le fichier n'est pas valide.
 * Maquette validée le 02/11/2026.
 */
@Component({
  selector: 'app-import-pointages-modal',
  imports: [LucideAngularModule],
  templateUrl: './import-pointages-modal.component.html',
  styleUrl: './import-pointages-modal.component.scss',
})
export class ImportPointagesModalComponent {
  private readonly activeModal = inject(NgbActiveModal);
  private readonly api = inject(PointagesApi);

  readonly icons = { X, Upload, FileSpreadsheet, CircleCheck, CircleAlert };
  readonly colonnes = COLONNES;

  readonly personneId = signal('');
  readonly personneNom = signal('');
  readonly fichier = signal<File | null>(null);
  readonly resultat = signal<ResultatImport | null>(null);
  readonly enCours = signal<'verification' | 'import' | null>(null);
  readonly survol = signal(false);

  readonly etat = computed<'choix' | 'format' | 'erreurs' | 'apercu'>(() => {
    const resultat = this.resultat();
    if (!resultat) {
      return 'choix';
    }
    if (!resultat.format?.conforme) {
      return resultat.format ? 'format' : 'erreurs';
    }
    return resultat.erreurs.length ? 'erreurs' : 'apercu';
  });
  readonly colonnesNonConformes = computed(() => this.resultat()?.format?.colonnes.filter((c) => !c.conforme).length ?? 0);
  readonly lignesEnErreur = computed(() => new Set(this.resultat()?.erreurs.map((e) => e.ligne).filter((l) => l !== null)).size);
  readonly jours = computed<JourApercu[]>(() => {
    const parJour = new Map<string, PointageImporte[]>();
    for (const pointage of this.resultat()?.pointages ?? []) {
      parJour.set(pointage.jour, [...(parJour.get(pointage.jour) ?? []), pointage]);
    }
    return [...parJour.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([jour, pointages]) => ({ jour, libelle: jourLong(jour), heures: somme(pointages), pointages }));
  });
  readonly totalHeures = computed(() => somme(this.resultat()?.pointages ?? []));

  // --- Choix du fichier -------------------------------------------------------

  choisir(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    input.value = '';
    if (fichier) {
      this.verifier(fichier);
    }
  }

  deposer(event: DragEvent): void {
    event.preventDefault();
    this.survol.set(false);
    const fichier = event.dataTransfer?.files?.[0];
    if (fichier) {
      this.verifier(fichier);
    }
  }

  survoler(event: DragEvent, actif: boolean): void {
    event.preventDefault();
    this.survol.set(actif);
  }

  autreFichier(): void {
    this.fichier.set(null);
    this.resultat.set(null);
  }

  // --- Contrôle et import -----------------------------------------------------

  private verifier(fichier: File): void {
    this.fichier.set(fichier);
    this.appeler('verification', this.api.verifierImport(this.personneId(), fichier), (resultat) => this.resultat.set(resultat));
  }

  importer(): void {
    const fichier = this.fichier();
    if (!fichier || this.enCours()) {
      return;
    }
    this.appeler('import', this.api.importer(this.personneId(), fichier), (resultat) => {
      if (resultat.importes > 0) {
        const premierJour = resultat.pointages.map((p) => p.jour).sort()[0] ?? '';
        this.activeModal.close({ importes: resultat.importes, premierJour } satisfies ImportPointagesResultat);
      } else {
        // Données modifiées entre le contrôle et l'import : nouvelles erreurs.
        this.resultat.set(resultat);
      }
    });
  }

  private appeler(etape: 'verification' | 'import', appel: Observable<ResultatImport>, suite: (resultat: ResultatImport) => void): void {
    this.enCours.set(etape);
    appel.subscribe({
      next: (resultat) => {
        this.enCours.set(null);
        suite(resultat);
      },
      error: (error: HttpErrorResponse) => {
        this.enCours.set(null);
        const message =
          (error.error as { error?: { message?: string; details?: { message: string }[] } } | null)?.error?.details?.[0]?.message ??
          (error.status === 413 ? 'Le fichier dépasse 5 Mo.' : "Le fichier n'a pas pu être traité. Réessayez.");
        this.resultat.set({ format: null, erreurs: [{ ligne: null, colonne: null, valeur: null, message }], pointages: [], importes: 0 });
      },
    });
  }

  close(): void {
    this.activeModal.dismiss();
  }

  // --- Affichage --------------------------------------------------------------

  heures(value: number): string {
    return `${value.toFixed(2).replace('.', ',')} h`;
  }

  pluriel(nombre: number, singulier: string, pluriel: string): string {
    return `${nombre} ${nombre > 1 ? pluriel : singulier}`;
  }
}

function somme(pointages: readonly PointageImporte[]): number {
  return pointages.reduce((total, p) => total + p.heures, 0);
}

/** « Lundi 26/10/2026 ». */
function jourLong(iso: string): string {
  const [annee, mois, jour] = iso.split('-').map(Number);
  const nom = new Date(annee!, mois! - 1, jour!).toLocaleDateString('fr-FR', { weekday: 'long' });
  return `${nom.charAt(0).toUpperCase()}${nom.slice(1)} ${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}
