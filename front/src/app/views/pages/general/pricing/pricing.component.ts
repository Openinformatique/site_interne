import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  CheckIcon,
  XIcon,
  LucideIconData,
  PackageIcon,
  BuildingIcon,
  Building2Icon,
} from 'lucide-angular';

type PlanKey = 'basic' | 'business' | 'professional';

interface Feature {
  text: string;
  included: boolean;
}

interface PlanConfig {
  key: PlanKey;
  name: string;
  subtitle: string;
  color: 'primary' | 'success';
  highlight: boolean;
  icon: LucideIconData;
  contactSales: boolean;
}

@Component({
  selector: 'app-pricing',
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './pricing.component.html',
})
export class PricingComponent {
  readonly packageIcon = PackageIcon;
  readonly buildingIcon = BuildingIcon;
  readonly building2Icon = Building2Icon;
  readonly checkIcon = CheckIcon;
  readonly xIcon = XIcon;

  isAnnual = false;

  readonly features: Record<PlanKey, Feature[]> = {
    basic: [
      { text: 'Up to 5 team members', included: true },
      { text: '5GB storage', included: true },
      { text: 'Basic reporting', included: true },
      { text: 'Email support', included: true },
      { text: 'Advanced analytics', included: false },
      { text: 'Custom integrations', included: false },
    ],
    business: [
      { text: 'Up to 25 team members', included: true },
      { text: '50GB storage', included: true },
      { text: 'Advanced reporting', included: true },
      { text: 'Priority support', included: true },
      { text: 'Basic integrations', included: true },
      { text: 'Custom solutions', included: false },
    ],
    professional: [
      { text: 'Unlimited team members', included: true },
      { text: 'Unlimited storage', included: true },
      { text: 'Custom reporting', included: true },
      { text: '24/7 phone support', included: true },
      { text: 'Advanced integrations', included: true },
      { text: 'Custom solutions', included: true },
    ],
  };

  readonly prices: Record<
    PlanKey,
    {
      monthly: number;
      annual: number;
    }
  > = {
    basic: {
      monthly: 29,
      annual: 24,
    },
    business: {
      monthly: 99,
      annual: 79,
    },
    professional: {
      monthly: 299,
      annual: 249,
    },
  };

  private readonly planConfig: PlanConfig[] = [
    {
      key: 'basic',
      name: 'Starter',
      icon: this.packageIcon,
      color: 'primary',
      subtitle: 'For small teams',
      highlight: false,
      contactSales: false,
    },
    {
      key: 'business',
      name: 'Business',
      icon: this.buildingIcon,
      color: 'success',
      subtitle: 'For growing businesses',
      highlight: true,
      contactSales: false,
    },
    {
      key: 'professional',
      name: 'Enterprise',
      icon: this.building2Icon,
      color: 'primary',
      subtitle: 'For large organizations',
      highlight: false,
      contactSales: true,
    },
  ];

  get plans() {
    return this.planConfig.map((plan) => ({
      ...plan,
      price: this.isAnnual
        ? this.prices[plan.key].annual
        : this.prices[plan.key].monthly,
      features: this.features[plan.key],
    }));
  }

  toggleBilling() {
    this.isAnnual = !this.isAnnual;
  }
}
