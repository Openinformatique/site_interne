import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { Highlight } from 'ngx-highlightjs';

@Component({
    selector: 'app-code-preview',
    imports: [
        NgbNavModule,
        Highlight
    ],
    templateUrl: './code-preview.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CodePreviewComponent {

  // Public properties
  readonly codeContent = input<any>();
  defaultNavActiveId = undefined;
  copyLabel = 'Copy';
  private copyTimeoutId: number | undefined;

  async copyCode(content: string) {
    if (!content) {
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      this.copyLabel = 'Copied';

      if (this.copyTimeoutId) {
        window.clearTimeout(this.copyTimeoutId);
      }

      this.copyTimeoutId = window.setTimeout(() => {
        this.copyLabel = 'Copy';
      }, 1000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  }

}
