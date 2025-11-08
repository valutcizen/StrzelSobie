import { type Page, type Locator } from '@playwright/test';

export class RangeLandingPage {
  readonly view: Locator;
  readonly title: Locator;
  readonly refreshButton: Locator;
  readonly openCalendarButton: Locator;
  readonly operatingHoursTable: Locator;

  constructor(page: Page) {
    this.view = page.getByTestId('range-landing-view');
    this.title = page.getByTestId('range-landing-title');
    this.refreshButton = page.getByTestId('range-landing-refresh-button');
    this.openCalendarButton = page.getByTestId('range-landing-open-calendar-button');
    this.operatingHoursTable = page.getByTestId('range-landing-operating-hours-table');
  }
}
