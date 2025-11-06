import { readFileSync } from 'fs';
import { resolve } from 'path';

type TranslationTree = Record<string, unknown>;

const translations: TranslationTree = JSON.parse(
  readFileSync(resolve(__dirname, '../../src/client/src/locales/pl.json'), 'utf-8'),
);

const getValue = (path: string): unknown => {
  const keys = path.split('.');
  let node: unknown = translations;

  for (const key of keys) {
    if (typeof node !== 'object' || node === null || !(key in node)) {
      throw new Error(`Missing translation for key "${path}" (stopped at "${key}")`);
    }
    node = (node as TranslationTree)[key];
  }

  return node;
};

export const translate = (
  path: string,
  params?: Record<string, string | number>,
): string => {
  const raw = getValue(path);

  if (typeof raw !== 'string') {
    throw new Error(`Translation at "${path}" is not a string.`);
  }

  if (!params) {
    return raw;
  }

  return raw.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = params[key];
    if (value === undefined) {
      throw new Error(`Missing interpolation value "${key}" for key "${path}"`);
    }
    return String(value);
  });
};
