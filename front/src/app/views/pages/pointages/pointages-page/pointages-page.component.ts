import { Component, DestroyRef, ElementRef, OnInit, ViewChild, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import {
  CalendarOptions,
  DateSelectArg,
  DatesSetArg,
  EventDropArg,
  EventHoveringArg,
  EventInput,
} from '@fullcalendar/core';
import frLocale from '@fullcalendar/core/locales/fr';
import interactionPlugin, { DateClickArg, EventResizeDoneArg } from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { NgbDropdownModule, NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import {
  CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  FileCheck,
  FileOutput,
  FileSpreadsheet,
  FileText,
  LucideAngularModule,
  Pencil,
  Printer,
  Trash2,
  X,
} from 'lucide-angular';
import Swal from 'sweetalert2';

import { PointagesApi } from '../../../../core/api/pointages-api.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { PointagesNavigation } from '../../../../core/services/pointages-navigation.service';
import { ApiError } from '../../../../core/models/api.model';
import { FACTURABLE, Pointage, PointageInput, PointagesReference } from '../../../../core/models/pointage.model';
import { PointageModalComponent, PointageModalResult } from '../pointage-modal/pointage-modal.component';
import { FormatReleve, ouvrirReleveMensuel } from '../releve-mensuel-modal/releve-mensuel-modal.component';
import { ouvrirEditionContrats as ouvrirFenetreEditionContrats } from '../edition-contrats-modal/edition-contrats-modal.component';
import { ouvrirExportCfl as ouvrirFenetreExportCfl } from '../export-cfl-modal/export-cfl-modal.component';
import { ouvrirImportPointages } from '../import-pointages-modal/import-pointages-modal.component';
import {
  couleurType,
  dureeHeures,
  formatHeures,
  hm,
  isoDate,
  JOURS_COURTS,
  JOURS_LONGS,
  libellePeriode,
  lundiDe,
  normalize,
  numeroSemaine,
  splitTags,
  titrePointage,
} from '../pointages.utils';

const MODAL_OPTIONS: NgbModalOptions = { backdropClass: 'fiche-modal-backdrop', modalDialogClass: 'fiche-modal fiche-modal-pointage', animation: true };

/** Plage visible par défaut : 7 h – 18 h (la journée complète défile dans le planning). */
const HEURE_VISIBLE = 7;
const HEURES_VISIBLES = 11;
const HEURE_MIN_PX = 30;
const HEURE_MAX_PX = 120;

/** Bulle de survol d'un bloc (position fixe, hors du planning). */
interface Bulle {
  pointage: Pointage;
  top: number;
  left: number;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Fantôme du pointage copié sous la souris : position fixe, découpé à la zone
 * défilante du planning (cadre) ; bloc positionné dans ce cadre.
 */
interface Fantome {
  cadre: Rect;
  bloc: Rect;
  couleur: string;
  titre: string;
  horaire: string;
}

/**
 * Écran « Pointages » : planning de la semaine d'une personne (FullCalendar,
 * vue semaine, 0 h – 24 h, positionné sur 7 h). Création par sélection d'une
 * plage (modale à la fin du glisser), modification par double-clic ou
 * bouton « Modifier », déplacement et durée à la souris, copier / coller,
 * suppression avec confirmation. Couleur des blocs = type d'action (TYPA).
 */
@Component({
  selector: 'app-pointages-page',
  imports: [FullCalendarModule, LucideAngularModule, NgbDropdownModule],
  templateUrl: './pointages-page.component.html',
  styleUrl: './pointages-page.component.scss',
})
export class PointagesPageComponent implements OnInit {
  private readonly api = inject(PointagesApi);
  private readonly auth = inject(AuthStore);
  private readonly modal = inject(NgbModal);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly navigation = inject(PointagesNavigation);

  @ViewChild('calendar') private calendarComponent?: FullCalendarComponent;

  readonly ChevronDown = ChevronDown;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly CalendarIcon = CalendarIcon;
  readonly Clock = Clock;
  readonly Copy = Copy;
  readonly FileCheck = FileCheck;
  readonly FileOutput = FileOutput;
  readonly FileSpreadsheet = FileSpreadsheet;
  readonly FileText = FileText;
  readonly Pencil = Pencil;
  readonly Printer = Printer;
  readonly Trash2 = Trash2;
  readonly X = X;

  readonly reference = signal<PointagesReference>({ types: [], tags: [], personnes: [], clients: [] });
  readonly personneId = signal<string>('');
  readonly pointages = signal<Pointage[]>([]);
  readonly weekend = signal(false);
  /** Lundi de la semaine affichée. */
  readonly semaine = signal<Date>(lundiDe(this.navigation.consommer() ?? new Date()));
  readonly weekPickerOpen = signal(false);
  readonly copie = signal<Pointage | null>(null);
  readonly bulle = signal<Bulle | null>(null);
  readonly fantome = signal<Fantome | null>(null);
  /** Hauteur d'une heure : hauteur visible du planning ÷ 11 (7 h – 18 h), 30 px minimum. */
  readonly heurePx = signal(44);

  readonly personneLocked = computed(() => !this.auth.isDirectionOrAdmin());
  readonly personneOptions = computed(() => {
    const moi = this.auth.currentUser()?.id;
    return this.reference().personnes.map((personne) => ({
      id: personne.id,
      label: personne.id.toLowerCase() === moi?.toLowerCase() ? `${personne.nom} (moi)` : personne.nom,
    }));
  });

  private readonly couleurs = computed(() => new Map(this.reference().types.map((type) => [type.cle, couleurType(type.couleur)])));
  private readonly libellesTypes = computed(() => new Map(this.reference().types.map((type) => [type.cle, type.libelle])));
  private readonly tagsParametres = computed(() => new Set(this.reference().tags.map(normalize)));

  readonly nbJours = computed(() => (this.weekend() ? 7 : 5));
  readonly numeroSemaine = computed(() => numeroSemaine(this.semaine()));
  readonly libelleSemaine = computed(() => libellePeriode(this.semaine(), this.jour(this.nbJours() - 1)));
  readonly weekPickerValue = computed(() => isoDate(this.semaine()));

  /** Heures par jour affiché (« AAAA-MM-JJ » → heures). */
  readonly totauxJours = computed(() => {
    const totaux = new Map<string, number>();
    for (const pointage of this.pointages()) {
      const debut = new Date(pointage.debut);
      const key = isoDate(debut);
      totaux.set(key, (totaux.get(key) ?? 0) + dureeHeures(debut, new Date(pointage.fin)));
    }
    return totaux;
  });
  readonly totalSemaine = computed(() => {
    let total = 0;
    for (let index = 0; index < this.nbJours(); index++) {
      total += this.totauxJours().get(isoDate(this.jour(index))) ?? 0;
    }
    return formatHeures(total);
  });

  readonly events = computed<EventInput[]>(() =>
    this.pointages().map((pointage) => {
      const couleur = this.couleurs().get(pointage.typeAction) ?? couleurType(null);
      return {
        id: String(pointage.id),
        start: pointage.debut,
        end: pointage.fin,
        backgroundColor: couleur,
        borderColor: couleur,
        textColor: '#10182b',
        extendedProps: { pointage },
      };
    }),
  );

  /** Options du planning (les pointages sont passés à part : [events]). */
  readonly calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    // Semaine demandée à la création (cloche d'alertes), sinon la semaine courante.
    initialDate: untracked(() => this.semaine()),
    locale: frLocale,
    headerToolbar: false,
    firstDay: 1,
    weekends: this.weekend(),
    allDaySlot: false,
    slotMinTime: '00:00:00',
    slotMaxTime: '24:00:00',
    scrollTime: `${String(HEURE_VISIBLE).padStart(2, '0')}:00:00`,
    scrollTimeReset: false,
    slotDuration: '00:15:00',
    slotLabelInterval: '01:00',
    slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    snapDuration: '00:15:00',
    // Hauteur minimale d'un bloc (15 px par défaut) inférieure à un quart d'heure :
    // sinon un bloc court « déborde » sur le suivant et les deux sont mis côte à côte.
    eventMinHeight: 4,
    height: '100%',
    expandRows: false,
    nowIndicator: false,
    // Création : glisser sur une plage (un simple clic ne crée rien).
    selectable: this.copie() === null,
    selectMirror: true,
    selectMinDistance: 5,
    unselectAuto: false,
    selectAllow: (span) => memeJournee(span.start, span.end),
    editable: true,
    eventDurationEditable: true,
    eventStartEditable: true,
    eventResizableFromStart: false,
    eventAllow: (span) => memeJournee(span.start, span.end),
    eventOverlap: true,
    eventClassNames: (arg) => (arg.event.extendedProps['pointage'] ? ['pt-evt'] : ['pt-sel']),
    select: (arg) => this.creer(arg),
    dateClick: (arg) => this.coller(arg),
    eventDrop: (arg) => this.deplacer(arg),
    eventResize: (arg) => this.deplacer(arg),
    eventDragStart: () => this.bulle.set(null),
    eventResizeStart: () => this.bulle.set(null),
    eventMouseEnter: (arg) => this.montrerBulle(arg),
    // Identifiant sur le bloc : retrouvé après enregistrement (rafraichirBulle).
    eventDidMount: (arg) => {
      arg.el.dataset['id'] = arg.event.id;
    },
    eventMouseLeave: () => this.bulle.set(null),
    datesSet: (arg) => this.periodeAffichee(arg),
  }));

  private resizeObserver?: ResizeObserver;
  /** Heure (décimale) affichée en haut du planning, conservée entre onglets. */
  private heureEnHaut = HEURE_VISIBLE;
  /** Vrai pendant un défilement provoqué par le code (non mémorisé). */
  private restauration = false;

  constructor() {
    // Page déjà ouverte : semaine demandée par la cloche d'alertes, pour
    // l'utilisateur connecté.
    effect(() => {
      if (!this.navigation.demande()) {
        return;
      }
      untracked(() => {
        const jour = this.navigation.consommer();
        const moi = this.moi();
        if (moi) {
          this.copie.set(null);
          this.personneId.set(moi);
        }
        if (jour) {
          this.allerA(jour);
        }
      });
    });

    // Rechargement à chaque changement de personne ou de semaine.
    effect(() => {
      const personneId = this.personneId();
      const lundi = this.semaine();
      if (personneId) {
        untracked(() => this.charger(personneId, lundi));
      }
    });
  }

  ngOnInit(): void {
    this.api.reference().subscribe((reference) => {
      this.reference.set(reference);
      this.personneId.set(this.moi() ?? reference.personnes[0]?.id ?? '');
    });
    this.observerHauteur();
  }

  // --- Barre d'outils -------------------------------------------------------

  setPersonne(event: Event): void {
    this.copie.set(null);
    this.personneId.set((event.target as HTMLSelectElement).value);
  }

  semainePrecedente(): void {
    this.allerA(this.decaler(-7));
  }

  semaineSuivante(): void {
    this.allerA(this.decaler(7));
  }

  aujourdHui(): void {
    this.allerA(new Date());
  }

  /** Un jour choisi affiche la semaine (lundi → dimanche) qui le contient. */
  choisirSemaine(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (match) {
      this.allerA(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    }
  }

  toggleWeekend(): void {
    this.weekend.update((weekend) => !weekend);
  }

  annulerCopie(): void {
    this.copie.set(null);
  }

  // --- Éditions ------------------------------------------------------------

  /** Relevé mensuel (PDF ou Excel) : personne affichée par défaut, modifiable par Admin et Direction. */
  ouvrirReleveMensuel(format: FormatReleve = 'pdf'): void {
    ouvrirReleveMensuel(this.modal, this.personneOptions(), this.personneId(), this.personneLocked(), format);
  }

  /** Contrats d'assistance : un PDF de suivi par contrat, réunis dans un zip (edition-contrats-modal). */
  ouvrirEditionContrats(): void {
    ouvrirFenetreEditionContrats(this.modal);
  }

  /** Export (format CFL) : travaux réalisés pour un client sur une période (export-cfl-modal). */
  ouvrirExportCfl(): void {
    ouvrirFenetreExportCfl(this.modal);
  }

  /** Identifiant de l'utilisateur connecté dans la liste des personnes (casse du référentiel). */
  private moi(): string | undefined {
    const moi = this.auth.currentUser()?.id.toLowerCase() ?? '';
    return this.reference().personnes.find((personne) => personne.id.toLowerCase() === moi)?.id;
  }

  /** Import Excel pour la personne affichée ; ensuite, planning sur la semaine du premier jour importé. */
  ouvrirImport(): void {
    const personneId = this.personneId();
    const nom = this.personneOptions().find((personne) => personne.id === personneId)?.label ?? '';
    void ouvrirImportPointages(this.modal, personneId, nom).then((resultat) => {
      if (!resultat) {
        return;
      }
      void Swal.fire({
        icon: 'success',
        title: `${resultat.importes} pointage${resultat.importes > 1 ? 's importés' : ' importé'}`,
        showConfirmButton: false,
        timer: 1600,
        width: 400,
      });
      const [annee, mois, jour] = resultat.premierJour.split('-').map(Number);
      const lundi = lundiDe(new Date(annee!, mois! - 1, jour!));
      if (lundi.getTime() === this.semaine().getTime()) {
        this.charger(personneId, lundi);
      } else {
        this.allerA(lundi);
      }
    });
  }

  private allerA(date: Date): void {
    this.calendarComponent?.getApi().gotoDate(lundiDe(date));
  }

  private decaler(jours: number): Date {
    const date = new Date(this.semaine());
    date.setDate(date.getDate() + jours);
    return date;
  }

  jour(index: number): Date {
    const date = new Date(this.semaine());
    date.setDate(date.getDate() + index);
    return date;
  }

  // --- Planning -------------------------------------------------------------

  /** En-tête de colonne : « lun. 26/10 » et total des heures du jour. */
  enteteJour(date: Date): { label: string; total: string } {
    const total = this.totauxJours().get(isoDate(date));
    return {
      label: `${JOURS_COURTS[(date.getDay() + 6) % 7]} ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`,
      total: total ? `${formatHeures(total)} h` : '—',
    };
  }

  /** Contenu d'un bloc (titre, tags, description) selon sa hauteur. */
  bloc(pointage: Pointage) {
    const debut = new Date(pointage.debut);
    const fin = new Date(pointage.fin);
    const heures = dureeHeures(debut, fin);
    const hauteur = heures * this.heurePx() - 3;
    const { tags, texte } = splitTags(pointage.description);
    const avecTags = tags.length > 0 && hauteur > 34;
    return {
      titre: titrePointage(pointage, heures),
      tags: tags.map((tag) => ({ label: tag, parametre: this.tagsParametres().has(normalize(tag)) })),
      avecTags,
      texte,
      filet: hauteur > 34,
      actionsAEspacer: hauteur > 30,
      lignes: hauteur > (avecTags ? 56 : 34) ? Math.max(1, Math.floor((hauteur - (avecTags ? 50 : 28)) / 15)) : 0,
      aria: `${titrePointage(pointage, heures)}, ${hm(debut)} – ${hm(fin)}`,
    };
  }

  /** Libellé de la plage en cours de sélection. */
  plage(start: Date | null, end: Date | null): string {
    return start && end ? `${hm(start)} – ${hm(end)}` : '';
  }

  bulleInfos(pointage: Pointage) {
    const debut = new Date(pointage.debut);
    const fin = new Date(pointage.fin);
    const heures = dureeHeures(debut, fin);
    const { tags, texte } = splitTags(pointage.description);
    const type = this.libellesTypes().get(pointage.typeAction) ?? pointage.typeAction;
    return {
      titre: titrePointage(pointage, heures),
      meta: `${type} · ${hm(debut)} – ${hm(fin)}${pointage.clientNom ? ` · ${pointage.clientNom}` : ''}`,
      tags: tags.map((tag) => ({ label: tag, parametre: this.tagsParametres().has(normalize(tag)) })),
      texte,
    };
  }

  private periodeAffichee(arg: DatesSetArg): void {
    const lundi = lundiDe(arg.start);
    if (lundi.getTime() !== this.semaine().getTime()) {
      this.semaine.set(lundi);
    }
  }

  private charger(personneId: string, lundi: Date): void {
    const au = new Date(lundi);
    au.setDate(au.getDate() + 7);
    this.api.list(personneId, lundi, au).subscribe((pointages) => {
      // Réponse périmée (personne ou semaine changée entre-temps) : ignorée.
      if (this.personneId() === personneId && this.semaine().getTime() === lundi.getTime()) {
        this.pointages.set(pointages);
      }
    });
  }

  /** Fin du glisser sur une plage : ouverture de la modale en création. */
  private creer(arg: DateSelectArg): void {
    this.ouvrir(null, arg.start, arg.end);
  }

  /** Double-clic sur un bloc ou bouton « Modifier » : modification. */
  modifier(pointage: Pointage, event?: Event): void {
    event?.stopPropagation();
    this.bulle.set(null);
    this.ouvrir(pointage);
  }

  private ouvrir(pointage: Pointage | null, debut?: Date, fin?: Date): void {
    this.bulle.set(null);
    const ref = this.modal.open(PointageModalComponent, MODAL_OPTIONS);
    (ref.componentInstance as PointageModalComponent).init(this.reference(), this.personneId(), pointage, debut, fin);
    ref.result.then(
      (result: PointageModalResult) => {
        this.calendarComponent?.getApi().unselect();
        if ('saved' in result) {
          this.remplacer(result.saved);
          this.toast('Pointage enregistré.');
        } else {
          this.pointages.update((pointages) => pointages.filter((candidate) => candidate.id !== result.deleted));
          this.toast('Pointage supprimé.');
        }
      },
      () => this.calendarComponent?.getApi().unselect(),
    );
  }

  /** Déplacement ou nouvelle durée (souris) : enregistré aussitôt, annulé en cas de refus. */
  private deplacer(arg: EventDropArg | EventResizeDoneArg): void {
    const pointage = arg.event.extendedProps['pointage'] as Pointage | undefined;
    if (!pointage || !arg.event.start || !arg.event.end) {
      arg.revert();
      return;
    }
    const input = versInput(pointage, arg.event.start, arg.event.end);
    this.api.update(pointage.id, input).subscribe({
      next: (saved) => {
        this.remplacer(saved);
        this.rafraichirBulle(saved);
      },
      error: (error: HttpErrorResponse) => {
        arg.revert();
        this.erreur(error);
      },
    });
  }

  copier(pointage: Pointage, event: Event): void {
    event.stopPropagation();
    this.bulle.set(null);
    this.copie.set(pointage);
  }

  // --- Fantôme du collage ---------------------------------------------------

  /** Dernière position de la souris sur le planning (recalcul au défilement). */
  private souris: { x: number; y: number } | null = null;

  suivreFantome(event: MouseEvent): void {
    this.souris = { x: event.clientX, y: event.clientY };
    this.majFantome();
  }

  cacherFantome(): void {
    this.souris = null;
    this.fantome.set(null);
  }

  /**
   * Créneau sous la souris, au quart d'heure inférieur comme le clic de
   * FullCalendar (dateClick), avec la durée du pointage copié limitée à minuit.
   */
  private majFantome(): void {
    const copie = this.copie();
    const scroller = this.scroller();
    if (!copie || !this.souris || !scroller) {
      this.fantome.set(null);
      return;
    }
    const { x, y } = this.souris;
    const cadre = scroller.getBoundingClientRect();
    const colonnes = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('.fc-timegrid-col[data-date]'));
    const colonne = colonnes.find((col) => {
      const rect = col.getBoundingClientRect();
      return x >= rect.left && x < rect.right;
    });
    if (!colonne || y < cadre.top || y >= cadre.bottom) {
      this.fantome.set(null);
      return;
    }
    const col = colonne.getBoundingClientRect();
    const heure = this.heurePx();
    const quarts = Math.min(95, Math.max(0, Math.floor(((y - col.top) / heure) * 4)));
    const [annee, mois, jour] = (colonne.dataset['date'] ?? '').split('-').map(Number);
    const debut = new Date(annee, mois - 1, jour, 0, quarts * 15);
    const minuit = new Date(annee, mois - 1, jour + 1);
    const duree = new Date(copie.fin).getTime() - new Date(copie.debut).getTime();
    const fin = new Date(Math.min(debut.getTime() + duree, minuit.getTime()));
    this.fantome.set({
      cadre: { top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height },
      bloc: {
        top: col.top - cadre.top + (quarts / 4) * heure + 1,
        left: col.left - cadre.left + 3,
        width: col.width - 6,
        height: Math.max(4, ((fin.getTime() - debut.getTime()) / 3_600_000) * heure - 3),
      },
      couleur: this.couleurs().get(copie.typeAction) ?? couleurType(null),
      titre: this.bulleInfos(copie).titre,
      horaire: `${JOURS_COURTS[(debut.getDay() + 6) % 7]} ${hm(debut)} – ${hm(fin)}`,
    });
  }

  /** Clic sur un créneau pendant une copie : collage avec la même durée. */
  private coller(arg: DateClickArg): void {
    const copie = this.copie();
    if (!copie) {
      return;
    }
    const debut = arg.date;
    let fin = new Date(debut.getTime() + (new Date(copie.fin).getTime() - new Date(copie.debut).getTime()));
    const minuit = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate() + 1);
    if (fin > minuit) {
      fin = minuit;
    }
    const input = { ...versInput(copie, debut, fin), utilisateurId: this.personneId() };
    this.api.create(input).subscribe({
      next: (saved) => {
        this.copie.set(null);
        this.remplacer(saved);
        this.toast(`Pointage collé le ${JOURS_COURTS[(debut.getDay() + 6) % 7]} à ${hm(debut)}.`);
      },
      error: (error: HttpErrorResponse) => this.erreur(error),
    });
  }

  async supprimer(pointage: Pointage, event: Event): Promise<void> {
    event.stopPropagation();
    this.bulle.set(null);
    const debut = new Date(pointage.debut);
    const heures = dureeHeures(debut, new Date(pointage.fin));
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Supprimer le pointage ?',
      text: `${titrePointage(pointage, heures)} — ${JOURS_LONGS[(debut.getDay() + 6) % 7]} de ${hm(debut)} à ${hm(new Date(pointage.fin))}.`,
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      reverseButtons: true,
      customClass: { confirmButton: 'swal-confirm-danger' },
    });
    if (!result.isConfirmed) {
      return;
    }
    this.api.delete(pointage.id).subscribe(() => {
      this.pointages.update((pointages) => pointages.filter((candidate) => candidate.id !== pointage.id));
      this.toast('Pointage supprimé.');
    });
  }

  /** Les boutons d'un bloc ne doivent pas démarrer un déplacement. */
  stop(event: Event): void {
    event.stopPropagation();
  }

  private remplacer(saved: Pointage): void {
    const lundi = this.semaine();
    const au = new Date(lundi);
    au.setDate(au.getDate() + 7);
    const visible = saved.utilisateurId.toLowerCase() === this.personneId().toLowerCase()
      && new Date(saved.debut) < au && new Date(saved.fin) > lundi;
    this.pointages.update((pointages) => {
      const others = pointages.filter((candidate) => candidate.id !== saved.id);
      return visible ? [...others, saved] : others;
    });
  }

  // --- Bulle de survol --------------------------------------------------------

  private montrerBulle(arg: EventHoveringArg): void {
    const pointage = arg.event.extendedProps['pointage'] as Pointage | undefined;
    if (pointage) {
      this.placerBulle(pointage, arg.el);
    }
  }

  /**
   * Après un déplacement ou une nouvelle durée, FullCalendar ne signale pas de
   * nouveau survol : bulle réaffichée avec le pointage enregistré si la souris
   * est toujours sur le bloc.
   */
  private rafraichirBulle(saved: Pointage): void {
    // Deux images : laisser le planning se redessiner avant de mesurer le bloc.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = this.host.nativeElement.querySelector<HTMLElement>(`.fc-timegrid-event[data-id="${saved.id}"]`);
      if (el?.matches(':hover')) {
        this.placerBulle(saved, el);
      }
    }));
  }

  private placerBulle(pointage: Pointage, el: HTMLElement): void {
    const rect = el.getBoundingClientRect();
    const largeur = 280;
    // À droite du bloc, à gauche s'il n'y a pas la place.
    const left = rect.right + 8 + largeur > window.innerWidth - 8 ? rect.left - 8 - largeur : rect.right + 8;
    const top = Math.min(Math.max(8, rect.top), window.innerHeight - 160);
    this.bulle.set({ pointage, top, left });
  }

  // --- Hauteur adaptative ---------------------------------------------------

  private observerHauteur(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => this.ajusterHauteur());
    // Le planning est rendu après la vue : observation dès que son défilement existe.
    // On observe le cadre (taille fixée par la page), pas le défilement, dont la
    // hauteur dépend de celle des heures (boucle d'agrandissement sinon).
    const attendre = () => {
      const cadre = this.cadre();
      if (cadre && this.scroller()) {
        this.resizeObserver?.observe(cadre);
        this.ajusterHauteur();
      } else {
        requestAnimationFrame(attendre);
      }
    };
    requestAnimationFrame(attendre);
    this.suivreDefilement();
    this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());
  }

  private scroller(): HTMLElement | null {
    return this.host.nativeElement.querySelector('.fc-timegrid-body')?.closest('.fc-scroller') ?? null;
  }

  private cadre(): HTMLElement | null {
    return this.host.nativeElement.querySelector('.planning');
  }

  private ajusterHauteur(): void {
    const scroller = this.scroller();
    const cadre = this.cadre();
    if (!scroller || !cadre) {
      return;
    }
    // Hauteur visible = du haut de la zone défilante au bas intérieur du cadre.
    const visible = cadre.getBoundingClientRect().bottom - cadre.clientTop - scroller.getBoundingClientRect().top;
    if (visible <= 0) {
      return;
    }
    const heure = Math.min(HEURE_MAX_PX, Math.max(HEURE_MIN_PX, Math.floor((visible - 1) / HEURES_VISIBLES)));
    if (heure !== this.heurePx()) {
      this.heurePx.set(heure);
    }
    // Retour sur l'onglet : la page conservée est rattachée au DOM avec un
    // défilement remis à zéro, et le cadre change de taille (0 → visible) ;
    // on revient à l'heure mémorisée (7 h au premier affichage).
    requestAnimationFrame(() => {
      this.calendarComponent?.getApi().updateSize();
      const courant = this.scroller();
      const cible = Math.round(this.heureEnHaut * heure);
      if (courant && Math.abs(courant.scrollTop - cible) > 1) {
        this.restauration = true;
        courant.scrollTop = cible;
      }
    });
  }

  /** Mémorise l'heure affichée en haut du planning (défilement de l'utilisateur). */
  private suivreDefilement(): void {
    const surDefilement = (event: Event) => {
      const scroller = this.scroller();
      if (event.target !== scroller || !scroller || scroller.clientHeight === 0) {
        return;
      }
      // Molette pendant une copie : le fantôme suit le créneau sous la souris.
      if (this.souris) {
        this.majFantome();
      }
      if (this.restauration) {
        this.restauration = false;
        return;
      }
      this.heureEnHaut = scroller.scrollTop / this.heurePx();
    };
    // Écoute en capture sur l'hôte : FullCalendar peut recréer la zone défilante.
    this.host.nativeElement.addEventListener('scroll', surDefilement, true);
    this.destroyRef.onDestroy(() => this.host.nativeElement.removeEventListener('scroll', surDefilement, true));
  }

  // --- Messages -------------------------------------------------------------

  private erreur(error: HttpErrorResponse): void {
    const apiError = (error.error as { error?: ApiError } | null)?.error;
    const details = apiError?.details?.map((detail) => detail.message) ?? [];
    void Swal.fire({
      icon: 'error',
      title: 'Pointage non enregistré',
      text: details.length ? details.join(' ') : (apiError?.message ?? 'Une erreur est survenue.'),
    });
  }

  private toast(title: string): void {
    void Swal.fire({ toast: true, position: 'bottom-end', title, showConfirmButton: false, timer: 2600, customClass: { popup: 'fiche-toast' } });
  }
}

/** Début et fin le même jour (une fin à minuit pile est admise). */
function memeJournee(start: Date, end: Date): boolean {
  const minuit = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  return end <= minuit;
}

/** Pointage déplacé / collé : la durée contrat suit la nouvelle durée si elle suivait l'ancienne. */
function versInput(pointage: Pointage, debut: Date, fin: Date): PointageInput {
  const ancienne = dureeHeures(new Date(pointage.debut), new Date(pointage.fin));
  const nouvelle = dureeHeures(debut, fin);
  const suit = pointage.facturable === FACTURABLE.non || pointage.tempsFacturable === null || Math.abs(pointage.tempsFacturable - ancienne) < 0.0001;
  return {
    utilisateurId: pointage.utilisateurId,
    debut: debut.toISOString(),
    fin: fin.toISOString(),
    typeAction: pointage.typeAction,
    clientId: pointage.clientId,
    commandeId: pointage.commandeId,
    contactId: pointage.contactId,
    description: pointage.description,
    facturable: pointage.facturable,
    tempsFacturable: suit ? Math.round(nouvelle * 10000) / 10000 : pointage.tempsFacturable,
  };
}
