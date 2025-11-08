import { type Page, type Locator } from '@playwright/test';

export class RangeUserManagementPage {
  readonly view: Locator;
  readonly refreshButton: Locator;
  readonly table: Locator;
  readonly snackbar: Locator;

  constructor(page: Page) {
    this.view = page.getByTestId('range-user-management-view');
    this.refreshButton = page.getByTestId('range-user-management-refresh-button');
    this.table = page.getByTestId('range-user-management-table');
    this.snackbar = page.getByTestId('range-user-management-snackbar');
  }

  getEditButton(userId: string | number): Locator {
    return this.view.getByTestId(`range-user-management-edit-button-${userId}`);
  }
}
