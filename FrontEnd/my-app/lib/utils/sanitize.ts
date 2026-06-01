import DOMPurify from 'dompurify';

interface SanitizeConfig {
  ALLOWED_TAGS: string[];
  ALLOWED_ATTR: string[];
  ALLOW_DATA_ATTR: boolean;
  FORCE_BODY?: boolean;
}

const isBrowser = typeof window !== 'undefined';

// Enforce rel="noopener noreferrer" on any anchor that carries a target attribute.
// This prevents tab-napping attacks on links opened in a new context.
if (isBrowser) {
  DOMPurify.addHook('afterSanitizeAttributes', (node: Element) => {
    if (node.tagName === 'A' && node.hasAttribute('target')) {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

const RICH_CONFIG: SanitizeConfig = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'br', 'p', 'ul', 'ol', 'li',
    'strong', 'b', 'em', 'i', 'u',
    'a', 'code', 'pre', 'blockquote', 'hr',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
  FORCE_BODY: false,
};

const BASIC_CONFIG: SanitizeConfig = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  ALLOW_DATA_ATTR: false,
};

const createSanitizer = (config: SanitizeConfig) => (dirty: string): string => {
  if (!dirty) return '';
  if (!isBrowser) return '';
  return DOMPurify.sanitize(dirty, config) as string;
};

export const sanitizeHtml = createSanitizer(RICH_CONFIG);

export const sanitizeRichHtml = createSanitizer(RICH_CONFIG);

export const sanitizeText = createSanitizer(BASIC_CONFIG);

export const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  if (!isBrowser) return '';
  const clean = DOMPurify.sanitize(url, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }) as string;
  try {
    const parsed = new URL(clean);
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return '';
    }
    return clean;
  } catch {
    return '';
  }
};

// Pure-string implementation — no DOM needed, safe in SSR and browser alike.
export const escapeHtml = (dirty: string): string => {
  if (!dirty) return '';
  return dirty
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};
