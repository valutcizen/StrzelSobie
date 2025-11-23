import { expect, test, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';
import { CalendarPage, RecordFormDialogPage } from './pages/calendar.page';
import { claimSlot } from './support/calendar-slots';
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

const scrollCalendarToSlot = async (page: Page, slot: { startTime: string } | null) => {
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

const deleteRecord = async (context: APIRequestContext, recordId: number | null) => {
  if (recordId === null) {
    return;
  }

  const candidates = [
    `${apiBaseUrl}/api/v1/records/${recordId}`,
    `${apiBaseUrl}/api/v1/ranges/${rangeSlug}/records/${recordId}`,
  ];

  for (const endpoint of candidates) {
    try {
      const response = await context.delete(endpoint);
      if (response.ok() || response.status() === 204) {
        return;
      }
    } catch {
      // ignore network failures for unsupported cleanup endpoints
    }
  }
};

test.describe('Records', () => {
  test('range admin can create a record for an off-system booking @range-admin', async ({ page }, testInfo) => {
    const calendarPage = new CalendarPage(page);
    const recordForm = new RecordFormDialogPage(page);
    const slotClaim = claimSlot(slotSeed(testInfo, 'record'));

    let recordId: number | null = null;

    try {
      const initialEventsPromise = waitForCalendarEvents(page);
      await page.goto(calendarPath);
      await initialEventsPromise;

      await calendarPage.recordWithoutReservationButton.click();
      await expect(recordForm.dialog).toBeVisible();

      await recordForm.dateInput.fill(slotClaim.slot.eventDate);
      await recordForm.startTimeInput.fill(slotClaim.slot.startTime);
      await recordForm.endTimeInput.fill(slotClaim.slot.endTime);
      await recordForm.participantsInput.fill('3');

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/v1/ranges/${rangeSlug}/records`) &&
          response.request().method() === 'POST',
      );
      const refreshPromise = waitForCalendarEvents(page);

      await recordForm.submitButton.click();

      const createResponse = await createResponsePromise;
      expect(createResponse.ok()).toBeTruthy();
      const payload = await createResponse.json();
      recordId = typeof payload.id === 'number' ? payload.id : null;
      expect(typeof recordId).toBe('number');

      await refreshPromise;

      await expect(calendarPage.snackbar).toContainText(translate('calendar.snackbar.recordSaved'));

      await scrollCalendarToSlot(page, slotClaim.slot);
      const recordLocator = page.locator(`[data-event-id="record-${recordId}"]`).first();
      await expect(recordLocator).toBeVisible({ timeout: 15000 });
    } finally {
      await deleteRecord(page.request, recordId);
      slotClaim.release();
    }
  });
});
