import { type Page, type Locator } from '@playwright/test';

export class NotFoundPage {
  readonly view: Locator;
  readonly backToCalendarButton: Locator;

  constructor(page: Page) {
    this.view = page.getByTestId('not-found-view');
    this.backToCalendarButton = page.getByTestId('not-found-back-to-calendar-button');
  }
}
