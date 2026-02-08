export const RANGE_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const isValidRangeSlug = (slug: string): boolean => RANGE_SLUG_REGEX.test(slug);
