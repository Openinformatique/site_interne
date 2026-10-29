import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ContentChange, QuillModule, SelectionChange } from 'ngx-quill';

@Component({
  selector: 'app-editors',
  imports: [
    RouterLink,
    QuillModule,
    FormsModule
  ],
  templateUrl: './editors.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditorsComponent {

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);

  /** Editor content (HTML). Quill may serialize with &nbsp;, &amp; etc. — that is valid and used for correct rendering. */
  htmlText = `<h2>Welcome to the rich text editor</h2><p>This example shows <strong>bold</strong>, <em>italic</em>, and <u>underlined</u> text. You can add lists, links, and more.</p><ul><li>First item</li><li>Second item</li></ul><p>Edit this content to see the <strong>live preview</strong> update.</p>`;
  quillConfig = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline', 'strike'],
        ['code-block'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'align': [] }],
        ['link', 'image', 'video']
      ],
    },
  };

  get previewHtml(): SafeHtml {
    const raw = this.htmlText ?? '';
    return raw.length > 0
      ? this.sanitizer.bypassSecurityTrustHtml(raw)
      : this.sanitizer.bypassSecurityTrustHtml('<p class="text-muted mb-0">Nothing to preview.</p>');
  }

  /** Decoded HTML for readable display in the "HTML source" section only. Quill stores entities like &nbsp; for valid HTML. */
  get htmlSourceDisplay(): string {
    const raw = this.htmlText ?? '';
    return raw
      .replace(/&nbsp;/g, '\u00A0')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  }

  onSelectionChanged = (event: SelectionChange) => {
    if (event.oldRange == null) {
      this.onFocus();
    }
    if (event.range == null) {
      this.onBlur();
    }
  };

  onContentChanged = () => {
    this.cdr.markForCheck();
  };

  onFocus = () => {
    console.log('On Focus');
  };

  onBlur = () => {
    console.log('Blurred');
  };

}
