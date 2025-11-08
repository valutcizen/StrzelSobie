import { type Page, type Locator } from '@playwright/test';

export class PrivacyPolicyPage {
  readonly view: Locator;

  constructor(page: Page) {
    this.view = page.getByTestId('privacy-policy-view');
  }
}
