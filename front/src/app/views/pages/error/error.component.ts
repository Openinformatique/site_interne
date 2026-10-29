import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule, HouseIcon } from 'lucide-angular';

@Component({
    selector: 'app-error',
    imports: [
        RouterLink,
        LucideAngularModule
    ],
    templateUrl: './error.component.html'
})
export class ErrorComponent implements OnInit {

  readonly houseIcon = HouseIcon;
  type: string | null;
  title: string;
  desc: string;

  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.type = this.route.snapshot.paramMap.get('type');
    
    switch(this.type) {
      case '404':
        this.title = 'Page Not Found';
        this.desc = 'Sorry, we couldn\'t find the page you\'re looking for. <br /> It might have been moved or deleted.';
        break;
      case '500':
        this.title = 'Internal Server Error',
        this.desc = 'The server encountered an internal error or misconfiguration and was unable to complete your request.'
        break;
      default:
        this.type = 'Ooops..';
        this.title = 'Something went wrong';
        this.desc = 'Looks like something went wrong.<br>' + 'We\'re working on it';
    }
  }

}
