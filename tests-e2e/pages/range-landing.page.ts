import { type Page, type Locator } from '@playwright/test';

export class RangeLandingPage {
  readonly view: Locator;
  readonly title: Locator;
  readonly refreshButton: Locator;
  readonly openCalendarButton: Locator;
  readonly backToMapButton: Locator;
  readonly actionBar: Locator;
  readonly operatingHoursTable: Locator;
  readonly bookingStatusChip: Locator;
  readonly bookingUnavailableAlert: Locator;
  readonly memberDescriptionCard: Locator;
  readonly memberDescriptionContent: Locator;
  readonly administratorContactsCard: Locator;
  readonly administratorContactsList: Locator;
  readonly publicDescription: Locator;

  constructor(page: Page) {
    this.view = page.getByTestId('range-landing-view');
    this.title = page.getByTestId('range-landing-title');
    this.refreshButton = page.getByTestId('range-landing-refresh-button');
    this.actionBar = page.getByTestId('range-action-bar');
    this.openCalendarButton = this.actionBar.getByTestId('range-open-calendar-button');
    this.backToMapButton = this.actionBar.getByTestId('range-back-to-map-button');
    this.operatingHoursTable = page.getByTestId('range-landing-operating-hours-table');
    this.bookingStatusChip = page.getByTestId('range-booking-status-chip');
    this.bookingUnavailableAlert = page.getByTestId('range-booking-unavailable-alert');
    this.memberDescriptionCard = page.getByTestId('range-member-description-card');
    this.memberDescriptionContent = page.getByTestId('range-member-description');
    this.administratorContactsCard = page.getByTestId('range-administrator-contacts-card');
    this.administratorContactsList = page.getByTestId('range-administrator-contacts-list');
    this.publicDescription = page.getByTestId('range-public-description');
  }
}
