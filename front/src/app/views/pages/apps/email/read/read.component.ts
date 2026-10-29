import { Component } from '@angular/core';
import { LucideAngularModule, StarIcon, Share2Icon, PrinterIcon, TrashIcon, FolderIcon, FileTextIcon } from 'lucide-angular';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-read',
  imports: [LucideAngularModule, NgbTooltipModule],
  templateUrl: './read.component.html',
  styleUrl: './read.component.scss'
})
export class ReadComponent {
  readonly starIcon = StarIcon;
  readonly shareIcon = Share2Icon;
  readonly printerIcon = PrinterIcon;
  readonly trashIcon = TrashIcon;
  readonly folderIcon = FolderIcon;
  readonly fileTextIcon = FileTextIcon;
}
