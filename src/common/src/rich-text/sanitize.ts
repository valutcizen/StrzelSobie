import sanitizeHtml, { type IOptions } from 'sanitize-html';

export type RichTextField = string | null | undefined;

const allowedTags = [
  'a',
  'blockquote',
  'br',
  'b',
  'div',
  'em',
  'h2',
  'h3',
  'img',
  'i',
  'li',
  'ol',
  'p',
  'strong',
  'ul',
];

const sanitizerOptions: IOptions = {
  allowedTags,
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'title'],
    '*': ['title'],
  },
  allowedSchemes: ['https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  parseStyleAttributes: false,
  transformTags: {
    b: 'strong',
    div: 'p',
    i: 'em',
    a: (_tagName, attribs) => ({
      tagName: 'a',
      attribs: typeof attribs.href === 'string' && isAllowedAnchorHref(attribs.href)
        ? {
            ...attribs,
            target: '_blank',
            rel: 'noopener noreferrer',
          }
        : withoutLinkSecurityAttributes(attribs),
    }),
  },
};

const isAllowedAnchorHref = (href: string): boolean => {
  const normalized = href.replace(/[\u0000-\u001f\u007f\s]+/g, '').toLowerCase();
  return normalized.startsWith('https://') || normalized.startsWith('mailto:') || normalized.startsWith('tel:');
};

const withoutLinkSecurityAttributes = (attribs: Record<string, string>): Record<string, string> => {
  const { href: _href, target: _target, rel: _rel, ...rest } = attribs;
  return rest;
};

export const sanitizeRichTextHtml = (html: string): string =>
  sanitizeHtml(html, sanitizerOptions).trim();

export const sanitizeOptionalRichTextHtml = (html: RichTextField): string | null => {
  if (typeof html !== 'string') {
    return null;
  }

  const sanitized = sanitizeRichTextHtml(html);
  return sanitized.length > 0 ? sanitized : null;
};
