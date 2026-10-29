import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import {
  LucideAngularModule,
  InboxIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
  PaperclipIcon
} from 'lucide-angular';

@Component({
  selector: 'app-inbox',
  imports: [NgbDropdownModule, RouterLink, LucideAngularModule],
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.scss'
})
export class InboxComponent {
  readonly inboxIcon = InboxIcon;
  readonly searchIcon = SearchIcon;
  readonly chevronLeftIcon = ChevronLeftIcon;
  readonly chevronRightIcon = ChevronRightIcon;
  readonly starIcon = StarIcon;
  readonly paperclipIcon = PaperclipIcon;
}
