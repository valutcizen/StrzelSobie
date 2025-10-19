import { describe, expect, it, vi } from 'vitest';

import { Result } from '@strzel-sobie/common';

describe('Result helpers contract', () => {
  it('creates a successful result and exposes its value', () => {
    const payload = { message: 'range confirmed' };

    const result = Result.ok(payload);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBe(payload);
    expect(() => result.getError()).toThrowError(
      'Cannot get the error of a successful result.',
    );
  });

  it('creates a failed result, logs the error, and exposes it safely', () => {
    const failure = new Error('reservation denied');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = Result.fail<string>(failure);

    expect(consoleSpy).toHaveBeenCalledOnce();
    expect(consoleSpy).toHaveBeenCalledWith(failure);
    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBe(failure);
    expect(() => result.getValue()).toThrowError(
      'Cannot get the value of a failed result.',
    );

    consoleSpy.mockRestore();
  });
});
