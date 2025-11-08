import { type Page, type Locator } from '@playwright/test';

export class LanguageSwitcherPage {
  readonly switcher: Locator;

  constructor(page: Page) {
    this.switcher = page.getByTestId('language-switcher');
  }

  getLanguageButton(lang: 'en' | 'pl'): Locator {
    return this.switcher.getByTestId(`language-switcher-${lang}`);
  }
}
