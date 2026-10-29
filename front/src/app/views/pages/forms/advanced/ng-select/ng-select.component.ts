import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NgLabelTemplateDirective,
  NgOptionTemplateDirective,
  NgSelectComponent as MyNgSelectComponent
} from '@ng-select/ng-select';
import { RouterLink } from '@angular/router';
import { UpperCasePipe } from '@angular/common';

import { USERS_MOCK } from '../../../../../core/mock-data/users.mock';
import { User } from '../../../../../core/models/demo-user.model';

@Component({
  selector: 'app-ng-select',
  imports: [
    RouterLink,
    NgLabelTemplateDirective,
    NgOptionTemplateDirective,
    MyNgSelectComponent,
    FormsModule,
    UpperCasePipe
  ],
  templateUrl: './ng-select.component.html'
})
export class NgSelectComponent {

  // ------------------------------------------------------------------
  // 1️⃣ Simple Select (Primitive Values)
  // ------------------------------------------------------------------

  readonly simpleItems: (string | number | boolean)[] = [true, 'Two', 3];
  selectedSimpleItem: string | number | boolean | null = null;


  // ------------------------------------------------------------------
  // 2️⃣ Users Data (Object-Based Select)
  // ------------------------------------------------------------------

  readonly users: User[] = USERS_MOCK;


  // Single select (bindValue="id")
  selectedUserId: string | null = null;

  // Searchable select
  selectedSearchUserId: string | null = null;

  // Multiple select (bindValue="id")
  selectedUserIds: string[] = [];

  // Grouped multi-select (if using bindValue="id")
  groupedMultiSelectedUserIds: string[] = [];

  // Custom template multi-select
  customTemplateSelectedUserIds: string[] = [];


  // Optional: trackBy for performance demos
  trackByUserId(index: number, item: User): string {
    return item.id;
  }
}
