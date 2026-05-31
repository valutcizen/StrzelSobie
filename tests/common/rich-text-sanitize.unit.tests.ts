import { describe, expect, it } from 'vitest';

import { sanitizeOptionalRichTextHtml, sanitizeRichTextHtml } from '@strzel-sobie/common/rich-text';

describe('rich text sanitizer', () => {
  it('keeps allowed formatting and safe links', () => {
    const html = '<h2>Intro</h2><div><b>Bold</b> <i>text</i> <a href="https://example.com">link</a></div>';

    expect(sanitizeRichTextHtml(html)).toBe(
      '<h2>Intro</h2><p><strong>Bold</strong> <em>text</em> <a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a></p>',
    );
  });

  it('removes scripts, event handlers, styles, and javascript links', () => {
    const html = '<p style="color:red" onclick="alert(1)">Hello</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a><a href="http://example.com">http</a>';

    expect(sanitizeRichTextHtml(html)).toBe('<p>Hello</p><a>bad</a><a>http</a>');
  });

  it('blocks encoded unsafe URL protocols', () => {
    const html = '<a href="jav&#x61;script:alert(1)">bad</a><img src="data:image/png;base64,aaa" onerror="alert(1)">';

    expect(sanitizeRichTextHtml(html)).toBe('<a>bad</a><img />');
  });

  it('normalizes empty optional rich text to null', () => {
    expect(sanitizeOptionalRichTextHtml('<script></script>')).toBeNull();
    expect(sanitizeOptionalRichTextHtml(null)).toBeNull();
  });
});
