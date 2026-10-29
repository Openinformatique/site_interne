import { Component } from '@angular/core';
import { LucideAngularModule, HeartIcon } from 'lucide-angular';

@Component({
    selector: 'app-footer',
    imports: [LucideAngularModule],
    templateUrl: './footer.component.html',
    styleUrl: './footer.component.scss'
})
export class FooterComponent {

  readonly heartIcon = HeartIcon;

}
