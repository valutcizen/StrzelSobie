import { type Page, type Locator } from '@playwright/test';

export class AuthPage {
  private readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly userMenuButton: Locator;
  readonly logoutButton: Locator;
  readonly loginTab: Locator;
  readonly registerTab: Locator;
  readonly registerEmailInput: Locator;
  readonly registerPasswordInput: Locator;
  readonly registerPasswordConfirmationInput: Locator;
  readonly registerButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginTab = page.getByTestId('auth-login-tab');
    this.registerTab = page.getByTestId('auth-register-tab');
    this.emailInput = page.getByTestId('login-email-input').locator('input');
    this.passwordInput = page.getByTestId('login-password-input').locator('input');
    this.loginButton = page.getByTestId('login-submit-button');
    this.userMenuButton = page.getByTestId('user-menu-button');
    this.logoutButton = page.getByTestId('logout-button');
    this.registerEmailInput = page.getByTestId('register-email-input').locator('input');
    this.registerPasswordInput = page.getByTestId('register-password-input').locator('input');
    this.registerPasswordConfirmationInput = page
      .getByTestId('register-password-confirmation-input')
      .locator('input');
    this.registerButton = page.getByTestId('register-submit-button');
  }

  async goto() {
    await this.page.goto('/auth');
  }

  async login(email: string, password_val: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password_val);
    await this.loginButton.click();
  }

  async logout() {
    await this.userMenuButton.click();
    await this.logoutButton.click();
  }

}
