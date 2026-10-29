import { Component, isDevMode } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgLabelTemplateDirective, NgOptionTemplateDirective, NgSelectComponent } from '@ng-select/ng-select';
import { ContentChange, QuillModule, SelectionChange } from 'ngx-quill';
import { USERS_MOCK } from '../../../../../core/mock-data/users.mock';
import { LucideAngularModule, SquarePenIcon } from 'lucide-angular';

@Component({
    selector: 'app-compose',
    imports: [
        NgLabelTemplateDirective,
        NgOptionTemplateDirective,
        NgSelectComponent,
        FormsModule,
        QuillModule,
        LucideAngularModule
    ],
    templateUrl: './compose.component.html',
    styleUrl: './compose.component.scss'
})
export class ComposeComponent {
  
  readonly squarePenIcon = SquarePenIcon;
  readonly users = USERS_MOCK;

  selectedTo = this.users.slice(2, 3).map(u => u.id); // default selected to
  selectedCc = this.users.slice(3, 6).map(u => u.id); // default selected cc

  messageValue = '';

  readonly quillConfig = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        [{ list: 'ordered'}, { list: 'bullet' }],
        [{ indent: '-1'}, { indent: '+1' }],          // outdent/indent
        // [{ direction: 'rtl' }],                      // text direction
        [{ align: [] }],
        ['link', 'image', 'video']
      ],
    },
  }

  onSelectionChanged(event: SelectionChange) {
    if (!event.oldRange) this.onFocus();
    if (!event.range) this.onBlur();
  }

  onContentChanged(event: ContentChange) {
    if (isDevMode()) {
      console.log(event.html);
    }
  }

  onFocus() {
    if (isDevMode()) console.log('On Focus');
  }
  
  onBlur() {
    if (isDevMode()) console.log('Blurred');
  }
}
