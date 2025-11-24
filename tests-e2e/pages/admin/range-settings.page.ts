import { type Page, type Locator } from '@playwright/test';

export class RangeSettingsPage {
  readonly view: Locator;
  readonly refreshButton: Locator;
  readonly totalTracksInput: Locator;
  readonly submitButton: Locator;
  readonly snackbar: Locator;

  constructor(page: Page) {
    this.view = page.getByTestId('range-settings-view');
    this.refreshButton = page.getByTestId('range-settings-refresh-button');
    this.totalTracksInput = page.getByTestId('range-settings-total-tracks-input').locator('input');
    this.submitButton = page.getByTestId('range-settings-submit-button');
    this.snackbar = page.getByTestId('range-settings-snackbar');
  }

  getDayIsOpenSwitch(day: string): Locator {
    return this.view.getByTestId(`range-settings-${day}-is-open-switch`);
  }

  getDayOpenTimeInput(day: string): Locator {
    return this.view.getByTestId(`range-settings-${day}-open-time-input`).locator('input');
  }

  getDayCloseTimeInput(day: string): Locator {
    return this.view.getByTestId(`range-settings-${day}-close-time-input`).locator('input');
  }
}
