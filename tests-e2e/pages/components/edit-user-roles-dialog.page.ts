import { type Page, type Locator } from '@playwright/test';

export class EditUserRolesDialogPage {
  readonly dialog: Locator;
  readonly rolesSelect: Locator;
  readonly cancelButton: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.dialog = page.getByTestId('edit-user-roles-dialog');
    this.rolesSelect = this.dialog.getByTestId('edit-user-roles-select');
    this.cancelButton = this.dialog.getByTestId('edit-user-roles-cancel-button');
    this.saveButton = this.dialog.getByTestId('edit-user-roles-save-button');
  }
}
