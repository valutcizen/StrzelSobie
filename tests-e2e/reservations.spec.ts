import { expect, test, type APIRequestContext, type Locator, type Page, type TestInfo } from '@playwright/test';
import {
  CalendarPage,
  EventDetailDialogPage,
  ReservationFormDialogPage,
} from './pages/calendar.page';
import { ConfirmationDialogPage } from './pages/components/confirmation-dialog.page';
import { claimSlot, type SlotCandidate } from './support/calendar-slots';
import { translate } from './support/i18n';

const rangeSlug = 'dobczyce';
const calendarPath = `/${rangeSlug}/calendar`;
const apiBaseUrl = 'http://localhost:5173';

const slotSeed = (testInfo: TestInfo, label: string) => `${testInfo.project.name}:${testInfo.title}:${label}`;

const waitForCalendarEvents = (page: Page) =>
  page.waitForResponse(
    (response) =>
      response.url().includes(`/api/v1/ranges/${rangeSlug}/events`) &&
      response.request().method() === 'GET' &&
      response.status() === 200,
  );

const scrollCalendarToSlot = async (page: Page, slot: SlotCandidate | null) => {
  if (!slot) {
    return;
  }

  const [hoursRaw, minutesRaw] = slot.startTime.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  const slotPositionHours = Number.isFinite(hours) ? hours + (Number.isFinite(minutes) ? minutes / 60 : 0) : 0;
  const pixelsPerHour = 44;
  const scrollTop = Math.max(0, (slotPositionHours - 2) * pixelsPerHour);

  const scroller = page.locator('.fc-scroller').first();
  await scroller.waitFor({ state: 'visible' });
  await scroller.evaluate((element, top) => {
    element.scrollTop = top;
  }, scrollTop);
};

const ensureSwitchChecked = async (switchWrapper: Locator) => {
  const checkbox = switchWrapper.locator('input[type="checkbox"]');
  await checkbox.waitFor({ state: 'attached' });
  if (await checkbox.isChecked()) {
    return;
  }
  await checkbox.check({ force: true });
};

const ensureJoinableSwitchChecked = async (switchWrapper: Locator) => {
  await expect(switchWrapper).not.toHaveClass(/v-input--disabled/);
  await ensureSwitchChecked(switchWrapper);
};

interface CreatePropositionOptions {
  numParticipants?: number;
  tracksRequested?: number;
}

const createProposition = async (
  context: APIRequestContext,
  slot: SlotCandidate,
  options?: CreatePropositionOptions,
) => {
  const response = await context.post(`${apiBaseUrl}/api/v1/ranges/${rangeSlug}/propositions`, {
    data: {
      eventDate: slot.eventDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      numParticipants: options?.numParticipants ?? 2,
      tracksRequested: options?.tracksRequested ?? 1,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create proposition (status: ${response.status()}).`);
  }

  const payload = await response.json();
  const id = typeof payload.id === 'number' ? payload.id : null;
  if (id === null) {
    throw new Error('Proposition response is missing an id.');
  }
  return id;
};

const deleteProposition = async (context: APIRequestContext, propositionId: number | null) => {
  if (propositionId === null) {
    return;
  }
  await context.delete(`${apiBaseUrl}/api/v1/propositions/${propositionId}`).catch(() => {});
};

interface CreateReservationOptions {
  numParticipants?: number;
  tracksRequested?: number;
  isPublic?: boolean;
  isJoinable?: boolean;
  propositionId?: number | null;
  force?: boolean;
}

const createReservation = async (
  context: APIRequestContext,
  slot: SlotCandidate,
  options?: CreateReservationOptions,
) => {
  const payload = {
    eventDate: slot.eventDate,
    startTime: slot.startTime,
    endTime: slot.endTime,
    numParticipants: options?.numParticipants ?? 3,
    tracksRequested: options?.tracksRequested ?? 2,
    isPublic: options?.isPublic ?? false,
    isJoinable: options?.isJoinable ?? false,
    propositionId: options?.propositionId ?? undefined,
  };

  const querySuffix = options?.force ? '?force=true' : '';
  let response = await context.post(
    `${apiBaseUrl}/api/v1/ranges/${rangeSlug}/reservations${querySuffix}`,
    { data: payload },
  );

  if (!response.ok() && response.status() === 400 && !options?.force) {
    try {
      const raw = await response.text();
      const parsed = JSON.parse(raw);
      if (parsed?.code === 'reservation_force_required') {
        response = await context.post(
          `${apiBaseUrl}/api/v1/ranges/${rangeSlug}/reservations?force=true`,
          { data: payload },
        );
      }
    } catch {
      // fall through to regular error handling
    }
  }

  if (!response.ok()) {
    throw new Error(`Failed to create reservation (status: ${response.status()}).`);
  }

  const result = await response.json();
  const id = typeof result.id === 'number' ? result.id : null;
  if (id === null) {
    throw new Error('Reservation response is missing an id.');
  }
  return id;
};

const deleteReservation = async (context: APIRequestContext, reservationId: number | null) => {
  if (reservationId === null) {
    return;
  }
  await context.delete(`${apiBaseUrl}/api/v1/reservations/${reservationId}`).catch(() => {});
};

const gotoCalendar = async (page: Page) => {
  const eventsPromise = waitForCalendarEvents(page);
  await page.goto(calendarPath);
  await eventsPromise;
};

test.describe('Reservations', () => {
  test('coordinator can convert a proposition into a reservation @coordinator', async ({ page }, testInfo) => {
    const calendarPage = new CalendarPage(page);
    const eventDetailDialog = new EventDetailDialogPage(page);
    const reservationForm = new ReservationFormDialogPage(page);
    const slotClaim = claimSlot(slotSeed(testInfo, 'convert'));

    let propositionId: number | null = null;
    let reservationId: number | null = null;

    try {
      propositionId = await createProposition(page.request, slotClaim.slot);
      await gotoCalendar(page);

      await scrollCalendarToSlot(page, slotClaim.slot);
      const propositionLocator = page.locator(`[data-event-id="proposition-${propositionId}"]`).first();
      await expect(propositionLocator).toHaveCount(1, { timeout: 15000 });
      await propositionLocator.click();

      await expect(eventDetailDialog.dialog).toBeVisible();
      await expect(eventDetailDialog.acceptButton).toBeVisible();
      await eventDetailDialog.acceptButton.click();
      await expect(reservationForm.dialog).toBeVisible();

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/v1/ranges/${rangeSlug}/reservations`) &&
          response.request().method() === 'POST',
      );
      const refreshPromise = waitForCalendarEvents(page);

      await reservationForm.submitButton.click();

      const createResponse = await createResponsePromise;
      expect(createResponse.ok()).toBeTruthy();
      const createdPayload = await createResponse.json();
      reservationId = typeof createdPayload.id === 'number' ? createdPayload.id : null;
      expect(typeof reservationId).toBe('number');

      await refreshPromise;

      await expect(calendarPage.snackbar).toContainText(translate('calendar.snackbar.reservationSaved'));
      await expect(page.locator(`[data-event-id="proposition-${propositionId}"]`)).toHaveCount(0, {
        timeout: 15000,
      });

      await scrollCalendarToSlot(page, slotClaim.slot);
      const reservationLocator = page.locator(`[data-event-id="reservation-${reservationId}"]`).first();
      await expect(reservationLocator).toHaveCount(1, { timeout: 15000 });
      await expect(reservationLocator).toBeVisible();
    } finally {
      await deleteReservation(page.request, reservationId);
      if (reservationId === null) {
        await deleteProposition(page.request, propositionId);
      }
      slotClaim.release();
    }
  });

  test('coordinator can adjust reservation details when accepting a proposition @coordinator', async ({ page }, testInfo) => {
    const calendarPage = new CalendarPage(page);
    const eventDetailDialog = new EventDetailDialogPage(page);
    const reservationForm = new ReservationFormDialogPage(page);
    const slotClaim = claimSlot(slotSeed(testInfo, 'convert-adjust'));

    let propositionId: number | null = null;
    let reservationId: number | null = null;

    try {
      propositionId = await createProposition(page.request, slotClaim.slot, {
        numParticipants: 2,
        tracksRequested: 1,
      });
      await gotoCalendar(page);

      await scrollCalendarToSlot(page, slotClaim.slot);
      await page.locator(`[data-event-id="proposition-${propositionId}"]`).first().click();

      await expect(eventDetailDialog.dialog).toBeVisible();
      await eventDetailDialog.acceptButton.click();
      await expect(reservationForm.dialog).toBeVisible();

      await reservationForm.participantsInput.fill('5');
      await reservationForm.tracksInput.fill('3');
      await ensureSwitchChecked(reservationForm.isPublicSwitch);
      await ensureJoinableSwitchChecked(reservationForm.isOpenForJoiningSwitch);

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/v1/ranges/${rangeSlug}/reservations`) &&
          response.request().method() === 'POST',
      );
      const refreshPromise = waitForCalendarEvents(page);

      await reservationForm.submitButton.click();
      const createResponse = await createResponsePromise;
      expect(createResponse.ok()).toBeTruthy();
      const payload = await createResponse.json();
      reservationId = typeof payload.id === 'number' ? payload.id : null;
      expect(typeof reservationId).toBe('number');

      await refreshPromise;
      await expect(calendarPage.snackbar).toContainText(translate('calendar.snackbar.reservationSaved'));

      const fetchDetailWithRetry = async (retries = 3, delayMs = 500) => {
        let lastError: unknown;
        for (let attempt = 0; attempt < retries; attempt++) {
          try {
            const response = await page.request.get(`/api/v1/reservations/${reservationId}`);
            if (response.ok()) {
              return response;
            }
            lastError = new Error(`Unexpected status ${response.status()}`);
          } catch (error) {
            lastError = error;
          }
          await page.waitForTimeout(delayMs);
        }
        throw lastError;
      };

      const detailResponse = await fetchDetailWithRetry();
      const detail = await detailResponse.json();
      const detailParticipants = detail.numParticipants ?? detail.num_participants;
      const detailTracks =
        detail.tracksRequested ??
        detail.tracks_requested ??
        detail.tracksAllocated ??
        detail.tracks_allocated;
      expect(detailParticipants).toBe(5);
      expect(detailTracks).toBe(3);
      expect(detail.isPublic ?? detail.is_public).toBe(true);
      expect(detail.isJoinable ?? detail.is_joinable ?? detail.openForJoining ?? detail.open_for_joining).toBe(true);
    } finally {
      await deleteReservation(page.request, reservationId);
      if (reservationId === null) {
        await deleteProposition(page.request, propositionId);
      }
      slotClaim.release();
    }
  });

  test('coordinator can create a reservation directly @coordinator', async ({ page }, testInfo) => {
    const calendarPage = new CalendarPage(page);
    const reservationForm = new ReservationFormDialogPage(page);
    const slotClaim = claimSlot(slotSeed(testInfo, 'direct'));

    let reservationId: number | null = null;

    try {
      await gotoCalendar(page);

      await calendarPage.newReservationButton.click();
      await expect(reservationForm.dialog).toBeVisible();

      await reservationForm.dateInput.fill(slotClaim.slot.eventDate);
      await reservationForm.startTimeInput.fill(slotClaim.slot.startTime);
      await reservationForm.endTimeInput.fill(slotClaim.slot.endTime);
      await reservationForm.tracksInput.fill('2');
      await reservationForm.participantsInput.fill('4');
      await ensureSwitchChecked(reservationForm.isPublicSwitch);
      await ensureJoinableSwitchChecked(reservationForm.isOpenForJoiningSwitch);

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/v1/ranges/${rangeSlug}/reservations`) &&
          response.request().method() === 'POST',
      );
      const refreshPromise = waitForCalendarEvents(page);

      await reservationForm.submitButton.click();

      const createResponse = await createResponsePromise;
      expect(createResponse.ok()).toBeTruthy();
      const created = await createResponse.json();
      reservationId = typeof created.id === 'number' ? created.id : null;
      expect(typeof reservationId).toBe('number');

      await refreshPromise;
      await expect(calendarPage.snackbar).toContainText(translate('calendar.snackbar.reservationSaved'));

      await scrollCalendarToSlot(page, slotClaim.slot);
      const reservationLocator = page.locator(`[data-event-id="reservation-${reservationId}"]`).first();
      await expect(reservationLocator).toBeVisible({ timeout: 15000 });
      await expect(reservationLocator).toHaveAttribute('class', /event-reservation-public/);
      await expect(reservationLocator).toHaveAttribute('class', /event-joinable/);
    } finally {
      await deleteReservation(page.request, reservationId);
      slotClaim.release();
    }
  });

  test('coordinator can cancel an existing reservation @coordinator', async ({ page }, testInfo) => {
    const calendarPage = new CalendarPage(page);
    const eventDetailDialog = new EventDetailDialogPage(page);
    const confirmationDialog = new ConfirmationDialogPage(page);
    const slotClaim = claimSlot(slotSeed(testInfo, 'cancel'));

    let reservationId: number | null = null;

    try {
      reservationId = await createReservation(page.request, slotClaim.slot);
      await gotoCalendar(page);

      await scrollCalendarToSlot(page, slotClaim.slot);
      await page.locator(`[data-event-id="reservation-${reservationId}"]`).first().click();

      await expect(eventDetailDialog.dialog).toBeVisible();
      await eventDetailDialog.cancelButton.click();

      await expect(confirmationDialog.dialog).toBeVisible();
      const deletePromise = page.waitForResponse((response) => {
        const url = response.url();
        return (
          response.request().method() === 'DELETE' &&
          (url.includes(`/api/v1/reservations/${reservationId}`) ||
            url.includes(`/api/v1/ranges/${rangeSlug}/reservations/${reservationId}`))
        );
      });
      const refreshPromise = waitForCalendarEvents(page);
      await confirmationDialog.confirmButton.click();

      const deleteResponse = await deletePromise;
      expect(deleteResponse.ok() || deleteResponse.status() === 204).toBeTruthy();
      await refreshPromise;

      await expect(calendarPage.snackbar).toContainText(translate('calendar.snackbar.reservationCancelled'));
      await expect(page.locator(`[data-event-id="reservation-${reservationId}"]`)).toHaveCount(0, {
        timeout: 15000,
      });
      reservationId = null;
    } finally {
      await deleteReservation(page.request, reservationId);
      slotClaim.release();
    }
  });

  test('overlapping reservations prompt a force warning before saving @coordinator', async ({ page }, testInfo) => {
    const calendarPage = new CalendarPage(page);
    const reservationForm = new ReservationFormDialogPage(page);
    const slotClaim = claimSlot(slotSeed(testInfo, 'overlap'));

    let blockingReservationId: number | null = null;
    let forcedReservationId: number | null = null;

    try {
      blockingReservationId = await createReservation(page.request, slotClaim.slot, {
        numParticipants: 3,
        tracksRequested: 2,
      });

      await gotoCalendar(page);
      await calendarPage.newReservationButton.click();
      await expect(reservationForm.dialog).toBeVisible();

      await reservationForm.dateInput.fill(slotClaim.slot.eventDate);
      await reservationForm.startTimeInput.fill(slotClaim.slot.startTime);
      await reservationForm.endTimeInput.fill(slotClaim.slot.endTime);
      await reservationForm.tracksInput.fill('1');
      await reservationForm.participantsInput.fill('2');

      const failureResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/v1/ranges/${rangeSlug}/reservations`) &&
          response.request().method() === 'POST',
      );

      await reservationForm.submitButton.click();

      const failureResponse = await failureResponsePromise;
      expect(failureResponse.ok()).toBeFalsy();

      const snackbarForceAdvice = translate('calendar.snackbar.forceAdvice');
      await expect(calendarPage.snackbar).toContainText(snackbarForceAdvice);
      await expect(reservationForm.dialog.getByText(translate('calendar.reservationDialog.forceSuggestion'))).toBeVisible();
      await ensureSwitchChecked(reservationForm.forceSwitch);

      const successResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/v1/ranges/${rangeSlug}/reservations`) &&
          response.request().method() === 'POST',
      );
      const refreshPromise = waitForCalendarEvents(page);

      await reservationForm.submitButton.click();

      const successResponse = await successResponsePromise;
      expect(successResponse.ok()).toBeTruthy();
      const result = await successResponse.json();
      forcedReservationId = typeof result.id === 'number' ? result.id : null;
      expect(typeof forcedReservationId).toBe('number');

      await refreshPromise;
      await expect(calendarPage.snackbar).toContainText(translate('calendar.snackbar.reservationSaved'));
    } finally {
      await deleteReservation(page.request, forcedReservationId);
      await deleteReservation(page.request, blockingReservationId);
      slotClaim.release();
    }
  });

  test('cancelling a reservation restores its original proposition @coordinator', async ({ page }, testInfo) => {
    const calendarPage = new CalendarPage(page);
    const eventDetailDialog = new EventDetailDialogPage(page);
    const confirmationDialog = new ConfirmationDialogPage(page);
    const slotClaim = claimSlot(slotSeed(testInfo, 'repropose'));

    let propositionId: number | null = null;
    let reservationId: number | null = null;

    try {
      propositionId = await createProposition(page.request, slotClaim.slot, {
        numParticipants: 2,
        tracksRequested: 1,
      });
      reservationId = await createReservation(page.request, slotClaim.slot, {
        propositionId,
        isPublic: false,
        isJoinable: false,
      });

      await gotoCalendar(page);
      await scrollCalendarToSlot(page, slotClaim.slot);
      await page.locator(`[data-event-id="reservation-${reservationId}"]`).first().click();

      await expect(eventDetailDialog.dialog).toBeVisible();
      await eventDetailDialog.cancelButton.click();
      await expect(confirmationDialog.dialog).toBeVisible();

      const deletePromise = page.waitForResponse((response) => {
        const url = response.url();
        return (
          response.request().method() === 'DELETE' &&
          (url.includes(`/api/v1/reservations/${reservationId}`) ||
            url.includes(`/api/v1/ranges/${rangeSlug}/reservations/${reservationId}`))
        );
      });
      const refreshPromise = waitForCalendarEvents(page);
      await confirmationDialog.confirmButton.click();

      await deletePromise;
      await refreshPromise;

      await expect(page.locator(`[data-event-id="reservation-${reservationId}"]`)).toHaveCount(0, {
        timeout: 15000,
      });
      await expect(page.locator(`[data-event-id="proposition-${propositionId}"]`)).toHaveCount(1, {
        timeout: 15000,
      });
      reservationId = null;
    } finally {
      await deleteReservation(page.request, reservationId);
      await deleteProposition(page.request, propositionId);
      slotClaim.release();
    }
  });
});
