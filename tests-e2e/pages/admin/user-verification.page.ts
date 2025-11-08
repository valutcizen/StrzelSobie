import { type Page, type Locator } from '@playwright/test';

export class UserVerificationPage {
  readonly view: Locator;
  readonly refreshButton: Locator;
  readonly snackbar: Locator;

  constructor(page: Page) {
    this.view = page.getByTestId('user-verification-view');
    this.refreshButton = page.getByTestId('user-verification-refresh-button');
    this.snackbar = page.getByTestId('user-verification-snackbar');
  }

  getUserItem(userId: string | number): Locator {
    return this.view.getByTestId(`user-verification-item-${userId}`);
  }

  getPromoteToMemberButton(userId: string | number): Locator {
    return this.view.getByTestId(`user-verification-promote-member-button-${userId}`);
  }

  getPromoteToCoordinatorButton(userId: string | number): Locator {
    return this.view.getByTestId(`user-verification-promote-coordinator-button-${userId}`);
  }
}
