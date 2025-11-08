import { type Page, type Locator } from '@playwright/test';

export class ProfilePage {
  readonly view: Locator;
  readonly card: Locator;
  readonly email: Locator;
  readonly roles: Locator;

  constructor(page: Page) {
    this.view = page.getByTestId('profile-view');
    this.card = page.getByTestId('profile-card');
    this.email = page.getByTestId('profile-email');
    this.roles = page.getByTestId('profile-roles');
  }
}
