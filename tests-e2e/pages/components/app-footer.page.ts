import { type Page, type Locator } from '@playwright/test';

export class AppFooterPage {
  readonly githubLink: Locator;
  readonly privacyPolicyLink: Locator;

  constructor(page: Page) {
    this.githubLink = page.getByTestId('footer-github-link');
    this.privacyPolicyLink = page.getByTestId('footer-privacy-policy-link');
  }
}
