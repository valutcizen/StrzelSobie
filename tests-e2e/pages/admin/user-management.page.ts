import { type Page, type Locator } from '@playwright/test';

export class UserManagementPage {
  readonly view: Locator;
  readonly refreshButton: Locator;
  readonly table: Locator;
  readonly snackbar: Locator;

  constructor(page: Page) {
    this.view = page.getByTestId('user-management-view');
    this.refreshButton = page.getByTestId('user-management-refresh-button');
    this.table = page.getByTestId('user-management-table');
    this.snackbar = page.getByTestId('user-management-snackbar');
  }

  getEditButton(userId: string | number): Locator {
    return this.view.getByTestId(`user-management-edit-button-${userId}`);
  }
}
