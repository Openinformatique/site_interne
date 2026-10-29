import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { User } from '../../../../core/models/user.model';
import { UserRole, USER_ROLE_LABELS } from '../../../../core/models/enums';

@Component({
  selector: 'app-change-role-modal',
  imports: [FormsModule],
  templateUrl: './change-role-modal.component.html',
})
export class ChangeRoleModalComponent implements OnInit {
  readonly modal = inject(NgbActiveModal);

  user!: User; // renseigné par l'appelant via componentInstance
  selected: UserRole = UserRole.Employee;

  readonly roles = [UserRole.Admin, UserRole.Manager, UserRole.Employee];
  readonly labels = USER_ROLE_LABELS;

  ngOnInit(): void {
    this.selected = this.user.role;
  }
}