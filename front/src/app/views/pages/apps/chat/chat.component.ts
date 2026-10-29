import { AfterViewInit, Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { NgbDropdownModule, NgbNavModule, NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { NgScrollbarModule } from 'ngx-scrollbar';
import {
  LucideAngularModule,
  SettingsIcon,
  EyeIcon,
  PencilIcon,
  ApertureIcon,
  SearchIcon,
  MessageSquareIcon,
  ImageIcon,
  VideoIcon,
  PhoneCallIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  UsersIcon,
  SmileIcon,
  PaperclipIcon,
  MicIcon,
  SendIcon,
  CornerUpLeftIcon,
  UserPlusIcon
} from 'lucide-angular';

@Component({
  selector: 'app-chat',
  imports: [
    NgbNavModule,
    NgbDropdownModule,
    NgScrollbarModule,
    NgbTooltip,
    LucideAngularModule
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements AfterViewInit, OnDestroy {
  readonly settingsIcon = SettingsIcon;
  readonly eyeIcon = EyeIcon;
  readonly pencilIcon = PencilIcon;
  readonly apertureIcon = ApertureIcon;
  readonly searchIcon = SearchIcon;
  readonly messageSquareIcon = MessageSquareIcon;
  readonly imageIcon = ImageIcon;
  readonly videoIcon = VideoIcon;
  readonly phoneCallIcon = PhoneCallIcon;
  readonly arrowUpRightIcon = ArrowUpRightIcon;
  readonly arrowDownLeftIcon = ArrowDownLeftIcon;
  readonly usersIcon = UsersIcon;
  readonly smileIcon = SmileIcon;
  readonly paperclipIcon = PaperclipIcon;
  readonly micIcon = MicIcon;
  readonly sendIcon = SendIcon;
  readonly cornerUpLeftIcon = CornerUpLeftIcon;
  readonly userPlusIcon = UserPlusIcon;

  defaultNavActiveId = 1;
  
  @ViewChild('asideBody', { read: ElementRef }) asideBody?: ElementRef<HTMLElement>;
  @ViewChild('chatContent', { read: ElementRef }) chatContent?: ElementRef<HTMLElement>;
  private chatItemClickHandler?: (event: Event) => void;

  ngAfterViewInit(): void {
    // Show the chat-content when a chat-item is clicked on tablet and mobile devices
    if (this.asideBody?.nativeElement) {
      this.chatItemClickHandler = (event: Event) => {
        const target = event.target as HTMLElement;
        const chatItem = target.closest('.chat-item');
        if (chatItem && this.chatContent?.nativeElement) {
          this.chatContent.nativeElement.classList.toggle('show');
        }
      };
      this.asideBody.nativeElement.addEventListener('click', this.chatItemClickHandler);
    }
  }

  ngOnDestroy(): void {
    // Clean up event listener
    if (this.asideBody?.nativeElement && this.chatItemClickHandler) {
      this.asideBody.nativeElement.removeEventListener('click', this.chatItemClickHandler);
    }
  }

  // Back to the chat-list on tablet and mobile devices
  backToChatList() {
    if (this.chatContent?.nativeElement) {
      this.chatContent.nativeElement.classList.toggle('show');
    }
  }
}
