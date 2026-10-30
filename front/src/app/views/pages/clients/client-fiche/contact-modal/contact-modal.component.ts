import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { LucideAngularModule, X } from 'lucide-angular';

import { ClientsApi } from '../../../../../core/api/clients-api.service';
import { ApiError } from '../../../../../core/models/api.model';
import { Contact } from '../../../../../core/models/client.model';

interface ContactDraft {
  civilite: string;
  nom: string;
  prenom: string;
  poste: string;
  telephone: string;
  adresseEmail: string;
  actif: boolean;
}

const REQUIRED: (keyof ContactDraft)[] = ['civilite', 'nom', 'poste'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Modale « Nouveau contact » / « Modifier le contact ». « Enregistrer »
 * enregistre immédiatement ; la modale renvoie le contact.
 */
@Component({
  selector: 'app-contact-modal',
  imports: [LucideAngularModule],
  templateUrl: './contact-modal.component.html',
  styleUrl: './contact-modal.component.scss',
})
export class ContactModalComponent {
  private readonly activeModal = inject(NgbActiveModal);
  private readonly clientsApi = inject(ClientsApi);

  readonly X = X;

  private clientId = 0;
  readonly contact = signal<Contact | null>(null);
  readonly draft = signal<ContactDraft>({ civilite: '', nom: '', prenom: '', poste: '', telephone: '', adresseEmail: '', actif: true });
  readonly errors = signal<Record<string, string>>({});
  readonly saving = signal(false);
  /** Libellés FONC ; le poste actuel du contact est ajouté s'il n'y figure pas. */
  readonly postes = signal<string[]>([]);

  readonly title = computed(() => (this.contact() ? 'Modifier le contact' : 'Nouveau contact'));

  /** À appeler juste après l'ouverture (contact null = création). */
  init(clientId: number, contact: Contact | null, postes: string[]): void {
    this.clientId = clientId;
    this.contact.set(contact);
    if (contact) {
      this.draft.set({
        civilite: contact.civilite === 1 || contact.civilite === 2 ? String(contact.civilite) : '',
        nom: contact.nom,
        prenom: contact.prenom ?? '',
        poste: contact.poste,
        telephone: contact.telephone ?? '',
        adresseEmail: contact.adresseEmail ?? '',
        actif: contact.actif,
      });
    }
    const poste = contact?.poste;
    this.postes.set(poste && !postes.includes(poste) ? [...postes, poste] : postes);
  }

  set(field: keyof ContactDraft, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.draft.update((draft) => ({ ...draft, [field]: value }));
    this.errors.update((errors) => ({ ...errors, [field]: '' }));
  }

  toggleActif(): void {
    this.draft.update((draft) => ({ ...draft, actif: !draft.actif }));
  }

  close(): void {
    this.activeModal.dismiss();
  }

  save(): void {
    const draft = this.draft();
    const errors: Record<string, string> = Object.fromEntries(
      REQUIRED.filter((field) => !String(draft[field]).trim()).map((field) => [field, 'Champ obligatoire.']),
    );
    if (draft.adresseEmail.trim() && !EMAIL_PATTERN.test(draft.adresseEmail.trim())) {
      errors['adresseEmail'] = "L'adresse e-mail n'est pas valide.";
    }
    if (Object.keys(errors).length > 0) {
      this.errors.set(errors);
      return;
    }
    this.saving.set(true);
    this.clientsApi
      .saveContact(this.clientId, this.contact()?.id ?? null, {
        civilite: Number(draft.civilite),
        nom: draft.nom.trim(),
        prenom: draft.prenom.trim() || null,
        poste: draft.poste,
        telephone: draft.telephone.trim() || null,
        adresseEmail: draft.adresseEmail.trim() || null,
        actif: draft.actif,
      })
      .subscribe({
        next: (contact) => this.activeModal.close(contact),
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          const details = (error.error as { error?: ApiError } | null)?.error?.details ?? [];
          this.errors.set(Object.fromEntries(details.map((detail) => [detail.field, detail.message])));
        },
      });
  }
}
