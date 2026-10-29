import { Component, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatatableComponent, NgxDatatableModule } from '@siemens/ngx-datatable';

@Component({
    selector: 'app-ngx-datatable',
    imports: [
        RouterLink,
        NgxDatatableModule
    ],
    templateUrl: './ngx-datatable.component.html'
})
export class NgxDatatableComponent {

  rows = [];
  temp = [];
  loadingIndicator = true;
  reorderable = true;

  @ViewChild('table') table: DatatableComponent

  constructor() {
    this.fetch((data: never[]) => {
      this.temp = [...data];
      this.rows = data;
      this.loadingIndicator = false;
    });
  }


  fetch(cb: any) {
    const req = new XMLHttpRequest();
    req.open('GET', `data/100k.json`);

    req.onload = () => {
      cb(JSON.parse(req.response));
    };

    req.send();
  }


  updateFilter(event: KeyboardEvent) {
    const val = (event.target as HTMLInputElement).value.toLocaleLowerCase();
    
    // filter our data
    const temp = this.temp.filter(function(d: any) {
      return d.name.toLocaleLowerCase().indexOf(val) !== -1 || !val;
    })

    // update the rows
    this.rows = temp;

    // whenever the filter changes, always go back to the first page
    this.table?.offset?.set(0);
  }

}
