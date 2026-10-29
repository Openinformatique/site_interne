import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ActivityIcon,
  BadgeCheckIcon,
  CameraIcon,
  CloudRainIcon,
  DownloadIcon,
  FileTextIcon,
  GlobeIcon,
  HeadphonesIcon,
  MailIcon,
  SunIcon,
  TagIcon,
  ZapIcon,
  GiftIcon
} from 'lucide-angular';

@Component({
  selector: 'app-icons',
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './icons.component.html'
})
export class IconsComponent {
  readonly giftIcon = GiftIcon;
  readonly activityIcon = ActivityIcon;
  readonly badgeCheckIcon = BadgeCheckIcon;
  readonly cameraIcon = CameraIcon;
  readonly cloudRainIcon = CloudRainIcon;
  readonly downloadIcon = DownloadIcon;
  readonly fileTextIcon = FileTextIcon;
  readonly globeIcon = GlobeIcon;
  readonly headphonesIcon = HeadphonesIcon;
  readonly mailIcon = MailIcon;
  readonly sunIcon = SunIcon;
  readonly tagIcon = TagIcon;
  readonly zapIcon = ZapIcon;
}
