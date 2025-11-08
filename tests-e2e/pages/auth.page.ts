import { type Page, type Locator } from '@playwright/test';

export class AuthPage {
  private readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly userMenuButton: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('login-email-input').locator('input');
    this.passwordInput = page.getByTestId('login-password-input').locator('input');
    this.loginButton = page.getByTestId('login-submit-button');
    this.userMenuButton = page.getByTestId('user-menu-button');
    this.logoutButton = page.getByTestId('logout-button');
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
