import { expect, test, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';
import {
  CalendarPage,
  EventDetailDialogPage,
  PropositionFormDialogPage,
} from './pages/calendar.page';
import { ConfirmationDialogPage } from './pages/components/confirmation-dialog.page';
import { claimSlot, type SlotCandidate } from './support/calendar-slots';
import { translate } from './support/i18n';

const rangeSlug = 'dobczyce';
const calendarPath = `/${rangeSlug}/calendar`;

const slotSeed = (testInfo: TestInfo, label: string) =>
  `${testInfo.project.name}:${testInfo.title}:${label}`;

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

const createPropositionViaApi = async (context: APIRequestContext, slot: SlotCandidate) => {
  const response = await context.post(`/api/v1/ranges/${rangeSlug}/propositions`, {
    data: {
      eventDate: slot.eventDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      tracksRequested: 1,
    },
  });

  if (!response.ok()) {
    throw new Error('Failed to create proposition via API.');
  }

  const payload = await response.json();
  const id = typeof payload.id === 'number' ? payload.id : null;
  if (id === null) {
    throw new Error('API did not return a valid proposition id.');
  }

  return id;
};

const deletePropositionViaApi = async (context: APIRequestContext, propositionId: number | null) => {
  if (propositionId === null) {
    return;
  }

  await context.delete(`/api/v1/propositions/${propositionId}`).catch(() => {});
};

test.describe('Propositions', () => {
  test('member can create a new proposition for a shooting session @member', async ({ page }, testInfo) => {
    const calendarPage = new CalendarPage(page);
    const propositionForm = new PropositionFormDialogPage(page);
    const { slot, release } = claimSlot(slotSeed(testInfo, 'create'));

    let propositionId: number | null = null;

    try {
      const initialEventsResponse = waitForCalendarEvents(page);
      await page.goto(calendarPath);
      await initialEventsResponse;

      await calendarPage.proposeSlotButton.click();
      await expect(propositionForm.dialog).toBeVisible();

      await propositionForm.dateInput.fill(slot.eventDate);
      await propositionForm.startTimeInput.fill(slot.startTime);
      await propositionForm.endTimeInput.fill(slot.endTime);
      await propositionForm.tracksInput.fill('1');

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/v1/ranges/${rangeSlug}/propositions`) &&
          response.request().method() === 'POST',
      );
      const refreshPromise = waitForCalendarEvents(page);

      await propositionForm.submitButton.click();

      const createResponse = await createResponsePromise;
      expect(createResponse.ok()).toBeTruthy();

      const createdPayload = await createResponse.json();
      propositionId = typeof createdPayload.id === 'number' ? createdPayload.id : null;
      expect(typeof propositionId).toBe('number');

      const eventsResponse = await refreshPromise;
      expect(eventsResponse.ok()).toBeTruthy();

      const snackbarMessage = translate('calendar.snackbar.propositionSubmitted');
      await expect(calendarPage.snackbar).toContainText(snackbarMessage);

      await scrollCalendarToSlot(page, slot);
      const propositionLocator = page.locator(`[data-event-id="proposition-${propositionId}"]`).first();
      await expect(propositionLocator).toHaveCount(1, { timeout: 15000 });
      await expect(propositionLocator).toBeVisible();
    } finally {
      await deletePropositionViaApi(page.request, propositionId);
      release();
    }
  });

  test('coordinator can cancel their own proposition @coordinator', async ({ page }, testInfo) => {
    const calendarPage = new CalendarPage(page);
    const eventDetailDialog = new EventDetailDialogPage(page);
    const confirmationDialog = new ConfirmationDialogPage(page);
    const { slot, release } = claimSlot(slotSeed(testInfo, 'cancel'));

    let propositionId: number | null = null;

    try {
      propositionId = await createPropositionViaApi(page.request, slot);

      const initialEventsResponse = waitForCalendarEvents(page);
      await page.goto(calendarPath);
      await initialEventsResponse;

      await scrollCalendarToSlot(page, slot);
      const propositionLocator = page.locator(`[data-event-id="proposition-${propositionId}"]`).first();
      await expect(propositionLocator).toHaveCount(1, { timeout: 15000 });
      await propositionLocator.click();

      await expect(eventDetailDialog.dialog).toBeVisible();
      await expect(eventDetailDialog.cancelButton).toBeVisible();

      const deletePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/v1/propositions/${propositionId}`) &&
          response.request().method() === 'DELETE',
      );

      await eventDetailDialog.cancelButton.click();
      await expect(confirmationDialog.dialog).toBeVisible();
      await confirmationDialog.confirmButton.click();

      const deleteResponse = await deletePromise;
      expect(deleteResponse.ok()).toBeTruthy();

      const cancelledId = propositionId;
      propositionId = null;

      const snackbarMessage = translate('calendar.snackbar.propositionCancelled');
      await expect(calendarPage.snackbar).toContainText(snackbarMessage);
      if (cancelledId !== null) {
        await expect(page.locator(`[data-event-id="proposition-${cancelledId}"]`)).toHaveCount(0, {
          timeout: 15000,
        });
      }
    } finally {
      await deletePropositionViaApi(page.request, propositionId);
      release();
    }
  });

  test('member propositions are highlighted on the calendar @member', async ({ page }, testInfo) => {
    const { slot, release } = claimSlot(slotSeed(testInfo, 'highlight'));

    let propositionId: number | null = null;

    try {
      propositionId = await createPropositionViaApi(page.request, slot);

      const initialEventsResponse = waitForCalendarEvents(page);
      await page.goto(calendarPath);
      await initialEventsResponse;

      await scrollCalendarToSlot(page, slot);
      const propositionLocator = page.locator(`[data-event-id="proposition-${propositionId}"]`).first();
      await expect(propositionLocator).toHaveCount(1, { timeout: 15000 });
      await expect(propositionLocator).toBeVisible();
      await expect(propositionLocator).toHaveAttribute('class', /event-proposition-member/);
      await expect(propositionLocator).toHaveAttribute('class', /event-member/);
    } finally {
      await deletePropositionViaApi(page.request, propositionId);
      release();
    }
  });
});
