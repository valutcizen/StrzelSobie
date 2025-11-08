import { type Page, type Locator } from '@playwright/test';

export class RegisterFormPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordConfirmationInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.emailInput = page.getByTestId('register-email-input').locator('input');
    this.passwordInput = page.getByTestId('register-password-input').locator('input');
    this.passwordConfirmationInput = page.getByTestId('register-password-confirmation-input').locator('input');
    this.submitButton = page.getByTestId('register-submit-button');
  }
}
