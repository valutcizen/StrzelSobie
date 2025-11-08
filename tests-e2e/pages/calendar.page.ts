import { type Page, type Locator } from '@playwright/test';

export class CalendarPage {
  readonly proposeSlotButton: Locator;
  readonly newReservationButton: Locator;
  readonly recordWithoutReservationButton: Locator;
  readonly calendar: Locator;
  readonly snackbar: Locator;

  constructor(page: Page) {
    this.proposeSlotButton = page.getByTestId('calendar-propose-slot-button');
    this.newReservationButton = page.getByTestId('calendar-new-reservation-button');
    this.recordWithoutReservationButton = page.getByTestId('calendar-record-without-reservation-button');
    this.calendar = page.getByTestId('calendar');
    this.snackbar = page.getByTestId('calendar-snackbar');
  }
}

export class EventDetailDialogPage {
  readonly dialog: Locator;
  readonly closeButton: Locator;
  readonly acceptButton: Locator;
  readonly cancelButton: Locator;
  readonly retryButton: Locator;

  constructor(page: Page) {
    this.dialog = page.getByTestId('event-detail-dialog');
    this.closeButton = this.dialog.getByTestId('event-detail-close-button');
    this.acceptButton = this.dialog.getByTestId('event-detail-accept-button');
    this.cancelButton = this.dialog.getByTestId('event-detail-cancel-button');
    this.retryButton = this.dialog.getByTestId('event-detail-retry-button');
  }
}

export class PropositionFormDialogPage {
  readonly dialog: Locator;
  readonly dateInput: Locator;
  readonly startTimeInput: Locator;
  readonly endTimeInput: Locator;
  readonly participantsInput: Locator;
  readonly tracksInput: Locator;
  readonly cancelButton: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.dialog = page.getByTestId('proposition-form-dialog');
    this.dateInput = this.dialog.getByTestId('proposition-form-date-input').locator('input');
    this.startTimeInput = this.dialog.getByTestId('proposition-form-start-time-input').locator('input');
    this.endTimeInput = this.dialog.getByTestId('proposition-form-end-time-input').locator('input');
    this.participantsInput = this.dialog.getByTestId('proposition-form-participants-input').locator('input');
    this.tracksInput = this.dialog.getByTestId('proposition-form-tracks-input').locator('input');
    this.cancelButton = this.dialog.getByTestId('proposition-form-cancel-button');
    this.submitButton = this.dialog.getByTestId('proposition-form-submit-button');
  }
}

export class RecordFormDialogPage {
  readonly dialog: Locator;
  readonly dateInput: Locator;
  readonly startTimeInput: Locator;
  readonly endTimeInput: Locator;
  readonly participantsInput: Locator;
  readonly cancelButton: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.dialog = page.getByTestId('record-form-dialog');
    this.dateInput = this.dialog.getByTestId('record-form-date-input').locator('input');
    this.startTimeInput = this.dialog.getByTestId('record-form-start-time-input').locator('input');
    this.endTimeInput = this.dialog.getByTestId('record-form-end-time-input').locator('input');
    this.participantsInput = this.dialog.getByTestId('record-form-participants-input').locator('input');
    this.cancelButton = this.dialog.getByTestId('record-form-cancel-button');
    this.submitButton = this.dialog.getByTestId('record-form-submit-button');
  }
}

export class ReservationFormDialogPage {
  readonly dialog: Locator;
  readonly dateInput: Locator;
  readonly startTimeInput: Locator;
  readonly endTimeInput: Locator;
  readonly tracksInput: Locator;
  readonly participantsInput: Locator;
  readonly isPublicSwitch: Locator;
  readonly isOpenForJoiningSwitch: Locator;
  readonly forceSwitch: Locator;
  readonly cancelButton: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.dialog = page.getByTestId('reservation-form-dialog');
    this.dateInput = this.dialog.getByTestId('reservation-form-date-input').locator('input');
    this.startTimeInput = this.dialog.getByTestId('reservation-form-start-time-input').locator('input');
    this.endTimeInput = this.dialog.getByTestId('reservation-form-end-time-input').locator('input');
    this.tracksInput = this.dialog.getByTestId('reservation-form-tracks-input').locator('input');
    this.participantsInput = this.dialog.getByTestId('reservation-form-participants-input').locator('input');
    this.isPublicSwitch = this.dialog.getByTestId('reservation-form-is-public-switch');
    this.isOpenForJoiningSwitch = this.dialog.getByTestId('reservation-form-is-open-for-joining-switch');
    this.forceSwitch = this.dialog.getByTestId('reservation-form-force-switch');
    this.cancelButton = this.dialog.getByTestId('reservation-form-cancel-button');
    this.submitButton = this.dialog.getByTestId('reservation-form-submit-button');
  }
}
