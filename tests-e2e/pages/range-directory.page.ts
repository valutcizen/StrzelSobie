import { type Locator, type Page } from '@playwright/test';

export class RangeDirectoryPage {
  readonly view: Locator;
  readonly map: Locator;
  readonly list: Locator;
  readonly rows: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.view = page.getByTestId('range-directory-view');
    this.map = page.getByTestId('range-map');
    this.list = page.getByTestId('range-list');
    this.table = this.list.getByTestId('range-list-table');
    this.rows = this.table.locator('tbody tr');
  }

  nameCell(slug: string): Locator {
    return this.table.locator(`[data-testid="range-list-name"][data-range-slug="${slug}"]`);
  }

  typeBadge(slug: string): Locator {
    return this.table.locator(`[data-testid="range-type-badge"][data-range-slug="${slug}"]`);
  }

  detailsButton(slug: string): Locator {
    return this.table.getByTestId(`range-list-details-button-${slug}`);
  }
}
