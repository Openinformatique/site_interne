import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, SendIcon, PrinterIcon } from 'lucide-angular';

@Component({
    selector: 'app-invoice',
    imports: [
        LucideAngularModule,
        RouterLink
    ],
    templateUrl: './invoice.component.html'
})
export class InvoiceComponent {

  readonly sendIcon = SendIcon;
  readonly printerIcon = PrinterIcon;

}
