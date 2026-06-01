import { describe, it, expect, beforeEach } from 'vitest';
import DOMPurify from 'dompurify';
import {
  sanitizeHtml,
  sanitizeRichHtml,
  sanitizeText,
  sanitizeUrl,
  escapeHtml,
} from '../sanitize';

// The hook is registered once at module load in browser (jsdom) environment.
// Re-importing the module in the same test run uses the already-registered hook.

describe('escapeHtml', () => {
  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes double and single quotes', () => {
    expect(escapeHtml('"hello" \'world\'')).toBe(
      '&quot;hello&quot; &#x27;world&#x27;'
    );
  });

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('returns plain text unchanged when no special characters', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('sanitizeUrl', () => {
  it('allows http URLs', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('allows https URLs', () => {
    expect(sanitizeUrl('https://example.com/path?q=1')).toBe(
      'https://example.com/path?q=1'
    );
  });

  it('allows mailto URLs', () => {
    expect(sanitizeUrl('mailto:user@example.com')).toBe(
      'mailto:user@example.com'
    );
  });

  it('rejects javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
  });

  it('rejects data: URIs', () => {
    expect(sanitizeUrl('data:text/html,<h1>xss</h1>')).toBe('');
  });

  it('rejects vbscript: protocol', () => {
    expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeUrl('')).toBe('');
  });

  it('returns empty string for invalid URL', () => {
    expect(sanitizeUrl('not a url at all !!!')).toBe('');
  });
});

describe('sanitizeRichHtml / sanitizeHtml', () => {
  it('allows permitted block and inline tags', () => {
    const input = '<p><strong>bold</strong> and <em>italic</em></p>';
    const result = sanitizeRichHtml(input);
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
  });

  it('strips <script> tags entirely', () => {
    const result = sanitizeRichHtml('<p>hello</p><script>alert(1)</script>');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert(1)');
    expect(result).toContain('<p>hello</p>');
  });

  it('strips event handler attributes', () => {
    const result = sanitizeRichHtml('<p onclick="alert(1)">click me</p>');
    expect(result).not.toContain('onclick');
    expect(result).toContain('click me');
  });

  it('strips data- attributes', () => {
    const result = sanitizeRichHtml('<p data-secret="x">text</p>');
    expect(result).not.toContain('data-secret');
  });

  it('strips disallowed tags like <iframe>', () => {
    const result = sanitizeRichHtml('<iframe src="evil.com"></iframe>');
    expect(result).not.toContain('<iframe');
  });

  it('strips javascript: hrefs', () => {
    const result = sanitizeRichHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain('javascript:');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeRichHtml('')).toBe('');
  });
});

describe('sanitizeText', () => {
  it('strips all HTML tags, leaving only text', () => {
    const result = sanitizeText('<p><strong>hello</strong></p>');
    expect(result).not.toContain('<p>');
    expect(result).not.toContain('<strong>');
    expect(result).toContain('hello');
  });

  it('strips script tags', () => {
    const result = sanitizeText('<script>evil()</script>text');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('evil()');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeText('')).toBe('');
  });
});

describe('rel enforcement hook', () => {
  it('adds rel="noopener noreferrer" to anchors with target attribute', () => {
    const result = sanitizeRichHtml('<a href="https://example.com" target="_blank">link</a>');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('does not add rel to anchors without a target attribute', () => {
    const result = sanitizeRichHtml('<a href="https://example.com">link</a>');
    // rel may be absent or empty — should not contain noopener for targetless links
    const parser = new DOMParser();
    const doc = parser.parseFromString(result, 'text/html');
    const anchor = doc.querySelector('a');
    const rel = anchor?.getAttribute('rel') ?? '';
    expect(rel).not.toContain('noopener');
  });
});
