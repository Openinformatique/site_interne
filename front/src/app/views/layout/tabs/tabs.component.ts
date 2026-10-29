import { Component, computed, inject } from '@angular/core';
import { XIcon, LucideAngularModule } from 'lucide-angular';
import { TabsService } from '../../../core/services/tabs.service';

@Component({
  selector: 'app-tabs',
  imports: [LucideAngularModule],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss'
})
export class TabsComponent {
  readonly closeIcon = XIcon;
  readonly tabsService = inject(TabsService);
  readonly tabs = this.tabsService.tabs;
  readonly activeTabId = this.tabsService.activeTabId;
  readonly hasClosableTabs = computed(() => this.tabs().some(tab => tab.closable));

  activateTab(tabId: string): void {
    this.tabsService.activateTab(tabId);
  }

  closeTab(event: MouseEvent, tabId: string): void {
    event.stopPropagation();
    void this.tabsService.closeTab(tabId);
  }

  closeAllTabs(): void {
    void this.tabsService.closeAllTabs();
  }

  handleTabKeydown(event: KeyboardEvent, tabId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.activateTab(tabId);
    }
  }
}