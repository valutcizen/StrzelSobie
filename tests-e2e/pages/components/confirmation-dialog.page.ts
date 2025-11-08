import { type Page, type Locator } from '@playwright/test';

export class ConfirmationDialogPage {
  readonly dialog: Locator;
  readonly cancelButton: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.dialog = page.getByTestId('confirmation-dialog');
    this.cancelButton = this.dialog.getByTestId('confirmation-dialog-cancel-button');
    this.confirmButton = this.dialog.getByTestId('confirmation-dialog-confirm-button');
  }
}
