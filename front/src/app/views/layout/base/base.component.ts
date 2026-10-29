import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouteConfigLoadEnd, RouteConfigLoadStart, Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { FooterComponent } from '../footer/footer.component';
import { ResizeBroadcastDirective } from '../../../core/directives/resize-broadcast.directive';
import { TabsComponent } from '../tabs/tabs.component';
import { TabsService } from '../../../core/services/tabs.service';

@Component({
    selector: 'app-base',
    imports: [
        RouterOutlet,
        NavbarComponent,
        SidebarComponent,
        FooterComponent,
        ResizeBroadcastDirective,
        TabsComponent
    ],
    templateUrl: './base.component.html',
    styleUrl: './base.component.scss'
})
export class BaseComponent implements OnInit, OnDestroy {

  isLoading = false;
  private router = inject(Router);
  private tabsService = inject(TabsService);
  private loadingCount = 0;
  private routerEventsSub?: Subscription;

  ngOnInit(): void {
    this.tabsService.initialize(this.router.url);

    // Spinner for lazy loading modules (loadChildren chunks)
    this.routerEventsSub = this.router.events.subscribe((event) => {
      if (event instanceof RouteConfigLoadStart) {
        this.loadingCount++;
        this.isLoading = true;
      } else if (event instanceof RouteConfigLoadEnd) {
        this.loadingCount--;
        this.isLoading = this.loadingCount > 0;
      }
    });
  }

  ngOnDestroy(): void {
    this.routerEventsSub?.unsubscribe();
  }

}
