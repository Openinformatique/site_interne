import { Component } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import {
  LucideAngularModule,
  SquarePenIcon,
  Columns2Icon,
  UserIcon,
  UsersIcon,
  ImageIcon,
  VideoIcon,
  EllipsisIcon,
  PencilIcon,
  GitBranchIcon,
  EyeIcon,
  GithubIcon,
  TwitterIcon,
  InstagramIcon,
  MehIcon,
  CornerRightUpIcon,
  Share2Icon,
  CopyIcon,
  HeartIcon,
  MessageSquareIcon,
  ShareIcon,
  UserPlusIcon
} from 'lucide-angular';

@Component({
  selector: 'app-profile',
  imports: [NgbDropdownModule, LucideAngularModule],
  templateUrl: './profile.component.html'
})
export class ProfileComponent {
  readonly squarePenIcon = SquarePenIcon;
  readonly columns2Icon = Columns2Icon;
  readonly userIcon = UserIcon;
  readonly usersIcon = UsersIcon;
  readonly imageIcon = ImageIcon;
  readonly videoIcon = VideoIcon;
  readonly ellipsisIcon = EllipsisIcon;
  readonly pencilIcon = PencilIcon;
  readonly gitBranchIcon = GitBranchIcon;
  readonly eyeIcon = EyeIcon;
  readonly githubIcon = GithubIcon;
  readonly twitterIcon = TwitterIcon;
  readonly instagramIcon = InstagramIcon;
  readonly mehIcon = MehIcon;
  readonly cornerRightUpIcon = CornerRightUpIcon;
  readonly share2Icon = Share2Icon;
  readonly copyIcon = CopyIcon;
  readonly heartIcon = HeartIcon;
  readonly messageSquareIcon = MessageSquareIcon;
  readonly shareIcon = ShareIcon;
  readonly userPlusIcon = UserPlusIcon;
}
