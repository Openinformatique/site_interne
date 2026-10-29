import { Component, OnInit } from '@angular/core';
import { CodePreviewComponent } from '../../../partials/code-preview/code-preview.component';
import { SquareCheckBigIcon, BoxIcon, LucideAngularModule, FacebookIcon, InstagramIcon, TwitterIcon, YoutubeIcon, GithubIcon, LinkedinIcon } from 'lucide-angular';

const defaultButtons = {
  htmlCode: 
`<button type="button" class="btn btn-primary">Primary</button>
<button type="button" class="btn btn-secondary">Secondary</button>
<button type="button" class="btn btn-success">Success</button>
<button type="button" class="btn btn-danger">Danger</button>
<button type="button" class="btn btn-warning">Warning</button>
<button type="button" class="btn btn-info">Info</button>
<button type="button" class="btn btn-light">Light</button>
<button type="button" class="btn btn-dark">Dark</button>

<button type="button" class="btn btn-link">Link</button>`,
  tsCode: 
`import { Component } from '@angular/core';

@Component({
  selector: 'app-buttons',
  templateUrl: './buttons.component.html'
})
export class ButtonsComponent {}`
}

const buttonTags = {
  htmlCode: 
`<a class="btn btn-primary" href="" (click)="false" role="button">Link</a>
<button class="btn btn-primary" type="submit">Button</button>
<input class="btn btn-primary" type="button" value="Input">
<input class="btn btn-primary" type="submit" value="Submit">
<input class="btn btn-primary" type="reset" value="Reset">`,
  tsCode: 
`import { Component } from '@angular/core';

@Component({
  selector: 'app-buttons',
  templateUrl: './buttons.component.html'
})
export class ButtonsComponent {}`
}

const outlineButtons = {
  htmlCode: 
`<button type="button" class="btn btn-outline-primary">Primary</button>`,
  tsCode: 
`import { Component } from '@angular/core';

@Component({
  selector: 'app-buttons',
  templateUrl: './buttons.component.html'
})
export class ButtonsComponent {}`
}

const buttonSizes = {
  htmlCode: 
`<button type="button" class="btn btn-primary btn-lg">Large button</button>
<button type="button" class="btn btn-primary btn-sm">Small button</button>
<button type="button" class="btn btn-primary">Default button</button>
<button type="button" class="btn btn-primary btn-xs">Extra small</button>`,
  tsCode: 
`import { Component } from '@angular/core';

@Component({
  selector: 'app-buttons',
  templateUrl: './buttons.component.html'
})
export class ButtonsComponent {}`
}

const blockButton = {
  htmlCode: 
`<div class="d-grid gap-2">
  <button type="button" class="btn btn-primary">Block level button</button>
  <button type="button" class="btn btn-secondary">Block level button</button>
</div>`,
  tsCode: 
`import { Component } from '@angular/core';

@Component({
  selector: 'app-buttons',
  templateUrl: './buttons.component.html'
})
export class ButtonsComponent {}`
}

const activeStateButton = {
  htmlCode: 
`<a href="" (click)="false" class="btn btn-primary active" role="button" aria-pressed="true">Primary link</a>
<a href="" (click)="false" class="btn btn-secondary active" role="button" aria-pressed="true">Link</a>`,
  tsCode: 
`import { Component } from '@angular/core';

@Component({
  selector: 'app-buttons',
  templateUrl: './buttons.component.html'
})
export class ButtonsComponent {}`
}

const disabledStateButton = {
  htmlCode: 
`<button type="button" class="btn btn-primary" disabled>Primary button</button>
<button type="button" class="btn btn-secondary" disabled>Button</button>`,
  tsCode: 
`import { Component } from '@angular/core';

@Component({
  selector: 'app-buttons',
  templateUrl: './buttons.component.html'
})
export class ButtonsComponent {}`
}

const disabledStateLinkButton = {
  htmlCode: 
`<a href="" (click)="false" class="btn btn-primary disabled" tabindex="-1" role="button" aria-disabled="true">Primary link</a>
<a href="" (click)="false" class="btn btn-secondary disabled" tabindex="-1" role="button" aria-disabled="true">Link</a>`,
  tsCode: 
`import { Component } from '@angular/core';

@Component({
  selector: 'app-buttons',
  templateUrl: './buttons.component.html'
})
export class ButtonsComponent {}`
}

const iconButton = {
  htmlCode: 
`<button type="button" class="btn btn-primary btn-icon">
  <lucide-icon [img]="squareCheckBigIcon" />
</button>
<button type="button" class="btn btn-danger btn-icon">
  <lucide-icon [img]="boxIcon" />
</button>`,
  tsCode: 
`import { Component } from '@angular/core';
import { LucideAngularModule, SquareCheckBigIcon, BoxIcon } from 'lucide-angular';

@Component({
  selector: 'app-buttons',
  imports: [LucideAngularModule],
  templateUrl: './buttons.component.html'
})
export class ButtonsComponent {
  readonly squareCheckBigIcon = SquareCheckBigIcon;
  readonly boxIcon = BoxIcon;
}`
}

const iconTextButton = {
  htmlCode: 
`<button type="button" class="btn btn-primary btn-icon-text">
  <lucide-icon [img]="squareCheckBigIcon" class="btn-icon-prepend" />
  Button with Icon
</button>
<button type="button" class="btn btn-primary btn-icon-text">
  Button with Icon
  <lucide-icon [img]="boxIcon" class="btn-icon-append" />
</button>`,
  tsCode: 
`import { Component } from '@angular/core';
import { LucideAngularModule, SquareCheckBigIcon, BoxIcon } from 'lucide-angular';

@Component({
  selector: 'app-buttons',
  imports: [LucideAngularModule],
  templateUrl: './buttons.component.html'
})
export class ButtonsComponent {
  readonly squareCheckBigIcon = SquareCheckBigIcon;
  readonly boxIcon = BoxIcon;
}`
}

const socialIconButton = {
  htmlCode: 
`<button type="button" class="btn btn-icon btn-facebook">
  <lucide-icon [img]="facebookIcon" />
</button>
<button type="button" class="btn btn-icon btn-instagram">
  <lucide-icon [img]="instagramIcon" />
</button>
<button type="button" class="btn btn-icon btn-twitter">
  <lucide-icon [img]="twitterIcon" />
</button>
<button type="button" class="btn btn-icon btn-youtube">
  <lucide-icon [img]="youtubeIcon" />
</button>
<button type="button" class="btn btn-icon btn-github">
  <lucide-icon [img]="githubIcon" />
</button>
<button type="button" class="btn btn-icon btn-linkedin">
  <lucide-icon [img]="linkedinIcon" />
</button>
<button type="button" class="btn btn-icon btn-outline-twitter">
  <lucide-icon [img]="twitterIcon" />
</button>`,
  tsCode: 
`import { Component } from '@angular/core';
import { LucideAngularModule, FacebookIcon, InstagramIcon, TwitterIcon, YoutubeIcon, GithubIcon, LinkedinIcon } from 'lucide-angular';

@Component({
  selector: 'app-buttons',
  imports: [LucideAngularModule],
  templateUrl: './buttons.component.html'
})
export class ButtonsComponent {
  readonly facebookIcon = FacebookIcon;
  readonly instagramIcon = InstagramIcon;
  readonly twitterIcon = TwitterIcon;
  readonly youtubeIcon = YoutubeIcon;
  readonly githubIcon = GithubIcon;
  readonly linkedinIcon = LinkedinIcon;
}`
}

const socialIconTextButton = {
  htmlCode: 
`<button type="button" class="btn btn-icon-text btn-facebook">
  <lucide-icon [img]="facebookIcon" class="btn-icon-prepend" />
  Facebook
</button>
<button type="button" class="btn btn-icon-text btn-instagram">
  <lucide-icon [img]="instagramIcon" class="btn-icon-prepend" />
  Instagram
</button>
<button type="button" class="btn btn-icon-text btn-twitter">
  <lucide-icon [img]="twitterIcon" class="btn-icon-prepend" />
  Twitter
</button>
<button type="button" class="btn btn-icon-text btn-youtube">
  <lucide-icon [img]="youtubeIcon" class="btn-icon-prepend" />
  Youtube
</button>
<button type="button" class="btn btn-icon-text btn-github">
  <lucide-icon [img]="githubIcon" class="btn-icon-prepend" />
  Github
</button>
<button type="button" class="btn btn-icon-text btn-linkedin">
  <lucide-icon [img]="linkedinIcon" class="btn-icon-prepend" />
  LinkedIn
</button>
<button type="button" class="btn btn-icon-text btn-outline-twitter">
  <lucide-icon [img]="twitterIcon" class="btn-icon-prepend" />
  Twitter
</button>`,
  tsCode: 
`import { Component } from '@angular/core';
import { LucideAngularModule, FacebookIcon, InstagramIcon, TwitterIcon, YoutubeIcon, GithubIcon, LinkedinIcon } from 'lucide-angular';

@Component({
  selector: 'app-buttons',
  imports: [LucideAngularModule],
  templateUrl: './buttons.component.html'
})
export class ButtonsComponent {
  readonly facebookIcon = FacebookIcon;
  readonly instagramIcon = InstagramIcon;
  readonly twitterIcon = TwitterIcon;
  readonly youtubeIcon = YoutubeIcon;
  readonly githubIcon = GithubIcon;
  readonly linkedinIcon = LinkedinIcon;
}`
}

@Component({
    selector: 'app-buttons',
    imports: [
        CodePreviewComponent,
        LucideAngularModule,
    ],
    templateUrl: './buttons.component.html'
})
export class ButtonsComponent implements OnInit {

  readonly squareCheckBigIcon = SquareCheckBigIcon;
  readonly boxIcon = BoxIcon;
  readonly facebookIcon = FacebookIcon;
  readonly instagramIcon = InstagramIcon;
  readonly twitterIcon = TwitterIcon;
  readonly youtubeIcon = YoutubeIcon;
  readonly githubIcon = GithubIcon;
  readonly linkedinIcon = LinkedinIcon;
  
  defaultButtonsCode: any;
  buttonTagsCode: any;
  outlineButtonsCode: any;
  buttonSizesCode: any;
  blockButtonCode: any;
  activeStateButtonCode: any;
  disabledStateButtonCode: any;
  disabledStateLinkButtonCode: any;
  iconButtonCode: any;
  iconTextButtonCode: any;
  socialIconButtonCode: any;
  socialIconTextButtonCode: any;

  ngOnInit(): void {
    this.defaultButtonsCode = defaultButtons;
    this.buttonTagsCode = buttonTags;
    this.outlineButtonsCode = outlineButtons;
    this.buttonSizesCode = buttonSizes;
    this.blockButtonCode = blockButton;
    this.activeStateButtonCode = activeStateButton;
    this.disabledStateButtonCode = disabledStateButton;
    this.disabledStateLinkButtonCode = disabledStateLinkButton;
    this.iconButtonCode = iconButton;
    this.iconTextButtonCode = iconTextButton;
    this.socialIconButtonCode = socialIconButton;
    this.socialIconTextButtonCode = socialIconTextButton;
  }

  scrollTo(element: any) {
    element.scrollIntoView({behavior: 'smooth'});
  }

}
