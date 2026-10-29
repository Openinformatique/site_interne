import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import {
  LucideAngularModule,
  ChevronDownIcon,
  InboxIcon,
  MailIcon,
  BriefcaseIcon,
  FileIcon,
  StarIcon,
  TrashIcon,
  TagIcon
} from 'lucide-angular';

@Component({
  selector: 'app-email',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgbCollapseModule,
    LucideAngularModule
  ],
  templateUrl: './email.component.html',
  styleUrl: './email.component.scss'
})
export class EmailComponent {
  readonly chevronDownIcon = ChevronDownIcon;
  readonly inboxIcon = InboxIcon;
  readonly mailIcon = MailIcon;
  readonly briefcaseIcon = BriefcaseIcon;
  readonly fileIcon = FileIcon;
  readonly starIcon = StarIcon;
  readonly trashIcon = TrashIcon;
  readonly tagIcon = TagIcon;

  public isAsideNavCollapsed = true;
}
