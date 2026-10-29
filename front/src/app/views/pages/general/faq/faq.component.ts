import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';
import { LucideAngularModule, SearchIcon } from 'lucide-angular';

interface FaqItem {
  question: string;
  answer: string;
  category: string;
  answerLines: string[];
}

@Component({
  selector: 'app-faq',
  imports: [RouterLink, NgbAccordionModule, LucideAngularModule],
  templateUrl: './faq.component.html',
})
export class FaqComponent {
  readonly searchIcon = SearchIcon;

  readonly faqs: FaqItem[] = [
    this.createFaq(
      'What payment methods do you accept?',
      `We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers. For enterprise customers, we also offer invoice-based payments with net-30 terms. All payments are processed securely through our PCI-compliant payment gateway. Subscriptions are automatically billed monthly or annually, depending on your chosen plan.`,
      'Billing',
    ),
    this.createFaq(
      'How secure is my data on your platform?',
      `We take security seriously. Our platform implements industry-standard security measures including:
- 256-bit SSL encryption for all data transfers
- Regular security audits and penetration testing
- SOC 2 Type II compliance
- GDPR and CCPA compliance
- Two-factor authentication (2FA)
- Daily automated backups with 30-day retention
All data is stored in ISO 27001 certified data centers.`,
      'Security',
    ),
    this.createFaq(
      'Can I cancel my subscription anytime?',
      `Yes, you can cancel your subscription at any time through your account dashboard. There are no long-term contracts or cancellation fees. If you cancel, you'll continue to have access to the service until the end of your current billing period. We don't offer refunds for partial months, but you're welcome to use the service until the period ends. Your data will be available for export for 30 days after cancellation.`,
      'Account',
    ),
    this.createFaq(
      'What kind of customer support do you offer?',
      `Our support varies by plan level:
- **Basic Plan**: Email support with 24-hour response time
- **Professional Plan**: Priority email support with 4-hour response time
- **Enterprise Plan**: 24/7 phone and email support with dedicated account manager
All customers have access to our extensive knowledge base, video tutorials, and community forums. We also offer free onboarding sessions for teams of 5 or more users.`,
      'Enterprise',
    ),
    this.createFaq(
      'Do you offer a free trial?',
      `Yes, we offer a 14-day free trial on all our plans. No credit card is required to start your trial. During the trial, you'll have access to all features of our Professional plan. You can upgrade, downgrade, or cancel at any time during the trial period. If you need more time to evaluate, our sales team can arrange for a trial extension on a case-by-case basis.`,
      'Account',
    ),
    this.createFaq(
      "What's included in the Enterprise plan?",
      `Our Enterprise plan includes:
- Unlimited users and storage
- Custom integration development
- Service Level Agreement (SLA)
- Single Sign-On (SSO) support
- Custom security requirements
- Dedicated success manager
- Priority feature requests
- Custom reporting and analytics
Contact our sales team for custom pricing and implementation details.`,
      'Enterprise',
    ),
    this.createFaq(
      'How do I reset my password?',
      `To reset your password, go to the login page and click on 'Forgot Password'. Follow the instructions sent to your registered email address to set a new password. If you do not receive the email, please check your spam folder or contact support for assistance.`,
      'Account',
    ),
    this.createFaq(
      'Can I upgrade or downgrade my plan?',
      `Yes, you can upgrade or downgrade your subscription plan at any time from your account dashboard. Changes to your plan will take effect immediately, and any billing adjustments will be prorated accordingly.`,
      'Billing',
    ),
    this.createFaq(
      'Is my information shared with third parties?',
      `We do not sell or share your personal information with third parties except as required by law or as necessary to provide our services (e.g., payment processing). Please review our Privacy Policy for more details.`,
      'Security',
    ),
    this.createFaq(
      'How do I invite team members?',
      `To invite team members, navigate to the 'Team' section in your account dashboard and click 'Invite Member'. Enter their email address and assign the appropriate role. They will receive an invitation email to join your organization.`,
      'Account',
    ),
    this.createFaq(
      'Do you offer custom integrations?',
      `Yes, we offer custom integrations for Enterprise customers. Please contact our sales or support team to discuss your specific requirements and implementation timeline.`,
      'Enterprise',
    ),
  ];

  readonly categories: string[] = [
    'All Categories',
    ...Array.from(new Set(this.faqs.map((faq) => faq.category))),
  ];

  selectedCategory = 'All Categories';
  searchQuery = '';

  get filteredFaqs(): FaqItem[] {
    const query = this.searchQuery.toLowerCase();

    return this.faqs.filter((faq) => {
      const matchesCategory =
        this.selectedCategory === 'All Categories' ||
        faq.category === this.selectedCategory;

      const content = `${faq.question} ${faq.answer}`.toLowerCase();
      const matchesSearch = !query || content.includes(query);

      return matchesCategory && matchesSearch;
    });
  }

  onCategoryChange(category: string) {
    this.selectedCategory = category;
  }

  onSearchChange(query: string) {
    this.searchQuery = query;
  }

  private createFaq(question: string, answer: string, category: string): FaqItem {
    return {
      question,
      answer,
      category,
      answerLines: answer.split('\n'),
    };
  }
}
