import { type Page, type Locator } from '@playwright/test';

export class NavigationPage {
  constructor(private page: Page) {}

  getLink(name: string): Locator {
    return this.page.getByTestId(`nav-${name}`);
  }
}
