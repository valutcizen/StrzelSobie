import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Silences `console.error` for the duration of the test suite that invokes it.
 *
 * Usage:
 * ```
 * mockConsoleError();
 * ```
 */
export function mockConsoleError() {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });
}

