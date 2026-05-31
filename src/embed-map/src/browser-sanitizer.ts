type SanitizerElement = HTMLElement & {
  setHTML?: (html: string) => void;
  setHTMLUnsafe?: (html: string, options?: { sanitizer?: unknown }) => void;
};

const createDefaultSanitizer = (): unknown | null => {
  const SanitizerConstructor = (window as typeof window & { Sanitizer?: new () => unknown }).Sanitizer;
  return SanitizerConstructor ? new SanitizerConstructor() : null;
};

export const setBrowserSanitizedHtml = (element: HTMLElement, html: string): void => {
  const target = element as SanitizerElement;

  if (typeof target.setHTML === 'function') {
    target.setHTML(html);
    return;
  }

  const sanitizer = createDefaultSanitizer();
  if (sanitizer && typeof target.setHTMLUnsafe === 'function') {
    target.setHTMLUnsafe(html, { sanitizer });
    return;
  }

  element.textContent = html;
};
