import { Component } from '@angular/core';
import { CodePreviewComponent } from '../../../partials/code-preview/code-preview.component';
import { NgbRatingModule } from '@ng-bootstrap/ng-bootstrap';
import { LucideAngularModule, StarIcon } from 'lucide-angular';

const defaultRating = {
  htmlCode: 
`<ngb-rating [(rate)]="currentRate"></ngb-rating>

<p class="text-secondary mt-2">Rate: <b>{{currentRate}}</b></p>`,
  tsCode: 
`import { Component } from '@angular/core';
import { NgbRatingModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-rating',
  imports: [NgbRatingModule],
  templateUrl: './rating.component.html'
})
export class RatingComponent {
  currentRate = 8;
}`
}

const customTemplate = {
  htmlCode: 
`<ngb-rating [(rate)]="currentRate">
  <ng-template let-fill="fill" let-index="index">
    <span [class.filled]="fill === 100" [class.bad]="index < 3">
      <lucide-icon [img]="starIcon" />
    </span>
  </ng-template>
</ngb-rating>

<p class="text-secondary mt-2">Rate: <b>{{currentRate}}</b></p>`,
  tsCode: 
`import { Component } from '@angular/core';
import { NgbRatingModule } from '@ng-bootstrap/ng-bootstrap';
import { LucideAngularModule, StarIcon } from 'lucide-angular';

@Component({
  selector: 'app-rating',
  imports: [NgbRatingModule, LucideAngularModule],
  templateUrl: './rating.component.html',
  styles: [\`
    lucide-icon, i {
      color: rgba(114, 124, 245, 0.3);
    }
    i {
      font-size: 1.5rem;
    }
    lucide-icon {
      width: 20px;
      height: 20px;
    }
    .filled lucide-icon, .filled i {
      color: #727cf5;
    }
    .bad lucide-icon, .bad i {
      color: rgba(255, 51, 102, 0.3);
    }
    .filled.bad lucide-icon, .filled.bad i {
      color: #ff3366;
    }
  \`]
})
export class RatingComponent {
  currentRate = 8;
  readonly starIcon = StarIcon;
}`
}

@Component({
    selector: 'app-rating',
    imports: [
        CodePreviewComponent,
        NgbRatingModule,
        LucideAngularModule
    ],
    templateUrl: './rating.component.html',
    styles: [`
    lucide-icon, i {
      color: rgba(114, 124, 245, 0.3);
    }
    i {
      font-size: 1.5rem;
    }
    lucide-icon {
      width: 20px;
      height: 20px;
    }
    .filled lucide-icon, .filled i {
      color: #727cf5;
    }
    .bad lucide-icon, .bad i {
      color: rgba(255, 51, 102, 0.3);
    }
    .filled.bad lucide-icon, .filled.bad i {
      color: #ff3366;
    }
  `]
})
export class RatingComponent {

  currentRate = 8;

  readonly starIcon = StarIcon;

  defaultRatingCode: any;
  customTemplateCode: any;

  ngOnInit(): void {
    this.defaultRatingCode = defaultRating;
    this.customTemplateCode = customTemplate
  }

  scrollTo(element: any) {
    element.scrollIntoView({behavior: 'smooth'});
  }

}
