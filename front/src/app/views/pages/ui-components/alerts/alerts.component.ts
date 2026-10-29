import { Component, OnInit } from '@angular/core';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { CodePreviewComponent } from '../../../partials/code-preview/code-preview.component';
import { MoonIcon, TriangleAlertIcon, LucideAngularModule, OctagonAlertIcon, SunIcon, CircleAlertIcon, CircleQuestionMarkIcon } from 'lucide-angular';

const defaultAlert = {
  htmlCode: 
`<ngb-alert [dismissible]="false" [type]="'primary'">
  A simple primary alert—check it out!
</ngb-alert>

<ngb-alert [dismissible]="false" [type]="'secondary'">...</ngb-alert>
<ngb-alert [dismissible]="false" [type]="'success'">...</ngb-alert>
<ngb-alert [dismissible]="false" [type]="'danger'">...</ngb-alert>
<ngb-alert [dismissible]="false" [type]="'warning'">...</ngb-alert>
<ngb-alert [dismissible]="false" [type]="'info'">...</ngb-alert>
<ngb-alert [dismissible]="false" [type]="'light'">...</ngb-alert>
<ngb-alert [dismissible]="false" [type]="'dark'">...</ngb-alert>`,
  tsCode: 
`import { Component } from '@angular/core';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-alerts',
  imports: [
    NgbAlertModule,
  ],
  templateUrl: './alerts.component.html'
})
export class AlertsComponent {}`
}

const fillAlert = {
  htmlCode: 
`<ngb-alert [dismissible]="false" [type]="'fill-primary'">
  A simple primary alert—check it out!
</ngb-alert>`,
  tsCode: 
`import { Component } from '@angular/core';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-alerts',
  imports: [
    NgbAlertModule,
  ],
  templateUrl: './alerts.component.html'
})
export class AlertsComponent {}`
}

const iconAlert = {
  htmlCode: 
`<ngb-alert [dismissible]="false" [type]="'primary'">
  <lucide-icon [img]="octagonAlertIcon" size="24" class="me-2" />
  A simple primary alert—check it out!
</ngb-alert>`,
  tsCode: 
`import { Component } from '@angular/core';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { LucideAngularModule, OctagonAlertIcon } from 'lucide-angular';

@Component({
  selector: 'app-alerts',
  imports: [
    NgbAlertModule,
    LucideAngularModule,
  ],
  templateUrl: './alerts.component.html'
})
export class AlertsComponent {
  readonly octagonAlertIcon = OctagonAlertIcon;
}`
}

const linkAlert = {
  htmlCode: 
`<ngb-alert [dismissible]="false" [type]="'primary'">
  A simple dark alert with <a href="" (click)="false" class="alert-link">an example link</a>. Give it a click if you like.
</ngb-alert>`,
  tsCode: 
`import { Component } from '@angular/core';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-alerts',
  imports: [
    NgbAlertModule,
  ],
  templateUrl: './alerts.component.html'
})
export class AlertsComponent {}`
}

const additionalContentAlert = {
  htmlCode: 
`<ngb-alert [dismissible]="false" [type]="'success'">
  <h4 class="alert-heading">Well done!</h4>
  <p>Aww yeah, you successfully read this important alert message. This example text is going to run a bit longer so that you can see how spacing within an alert works with this kind of content.</p>
  <hr>
  <p class="mb-0">Whenever you need to, be sure to use margin utilities to keep things nice and tidy.</p>
</ngb-alert>`,
  tsCode: 
`import { Component } from '@angular/core';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-alerts',
  imports: [
    NgbAlertModule,
  ],
  templateUrl: './alerts.component.html'
})
export class AlertsComponent {}`
}

const dismissingAlert = {
  htmlCode: 
`@if (!alert1closed) {
  <ngb-alert [type]="'primary'" (close)="alert1closed=true">
    <strong>Holy guacamole!</strong> You should check in on some of those fields below.
  </ngb-alert>
}`,
  tsCode: 
`import { Component } from '@angular/core';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-alerts',
  imports: [
    NgbAlertModule,
  ],
  templateUrl: './alerts.component.html'
})
export class AlertsComponent {

  alert1closed: boolean = false;

}`
}

@Component({
    selector: 'app-alerts',
    imports: [
        CodePreviewComponent,
        NgbAlertModule,
        LucideAngularModule,
    ],
    templateUrl: './alerts.component.html'
})
export class AlertsComponent implements OnInit {

  readonly octagonAlertIcon = OctagonAlertIcon;
  readonly triangleAlertIcon = TriangleAlertIcon;
  readonly moonIcon = MoonIcon;
  readonly circleQuestionMarkIcon = CircleQuestionMarkIcon;
  readonly sunIcon = SunIcon;
  readonly circleAlertIcon = CircleAlertIcon;

  defaultAlertCode: any;
  fillAlertCode: any;
  iconAlertCode: any;
  linkAlertCode: any;
  additionalContentAlertCode: any;
  dismissingAlertCode: any;

  alert1closed: boolean = false;
  alert2closed: boolean = false;
  alert3closed: boolean = false;
  alert4closed: boolean = false;
  alert5closed: boolean = false;
  alert6closed: boolean = false;
  alert7closed: boolean = false;
  alert8closed: boolean = false;

  ngOnInit(): void {
    this.defaultAlertCode = defaultAlert;
    this.fillAlertCode = fillAlert;
    this.iconAlertCode = iconAlert;
    this.linkAlertCode = linkAlert;
    this.additionalContentAlertCode = additionalContentAlert;
    this.dismissingAlertCode = dismissingAlert;
  }

  scrollTo(element: any) {
    element.scrollIntoView({behavior: 'smooth'});
  }

}
