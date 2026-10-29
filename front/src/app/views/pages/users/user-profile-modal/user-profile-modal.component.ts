import { Component, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { User } from '../../../../core/models/user.model';
import { USER_ROLE_LABELS } from '../../../../core/models/enums';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';

@Component({
  selector: 'app-user-profile-modal',
  imports: [DateFrPipe],
  templateUrl: './user-profile-modal.component.html',
})
export class UserProfileModalComponent {
  readonly modal = inject(NgbActiveModal);

  user!: User; // renseigné par l'appelant via componentInstance
  readonly labels = USER_ROLE_LABELS;
}
