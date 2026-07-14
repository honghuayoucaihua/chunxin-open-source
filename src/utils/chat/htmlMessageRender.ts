const HTML_DOC_MARKER = /<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>]/i;
const HTML_COMPLEX_TAG = /<script[\s>]|<style[\s>]|<iframe[\s>]|<svg[\s>]|<table[\s>]|<form[\s>]/i;
const HTML_PAIRED_TAG = /<(div|section|main|article|header|footer|aside|nav|p|span|ul|ol|li|h[1-6]|a|button|pre|code|blockquote)\b[^>]*>[\s\S]*<\/\1>/i;
const HTML_SELF_CLOSING_TAG = /<(img|input|br|hr|meta|link)\b[^>]*\/?\s*>/i;
const HTML_GENERIC_TAG = /<[a-z][a-z0-9-]*\b[^>]*>/i;
const ESCAPED_HTML_MARKER = /&lt;(?:!doctype\s+html|html|head|body|div|section|main|article|p|span|a|img|table|form)\b/i;
const DEV_RUNTIME_PATTERNS = [
  /<script[^>]*src=["'](?:https?:\/\/localhost:\d+\/)?@vite\/client[^"']*["'][^>]*><\/script>/gi,
  /<script[^>]*src=["'](?:https?:\/\/localhost:\d+\/)?@react-refresh[^"']*["'][^>]*><\/script>/gi,
  /<script[^>]*src=["'](?:https?:\/\/localhost:\d+\/)?@vite-plugin-pwa\/pwa-entry-point-loaded[^"']*["'][^>]*><\/script>/gi,
  /<script[^>]*src=["'](?:https?:\/\/localhost:\d+\/)?index\.tsx[^"']*["'][^>]*><\/script>/gi,
  /<script[^>]*src=["']\/@vite\/client[^"']*["'][^>]*><\/script>/gi,
  /<script[^>]*src=["']\/@react-refresh[^"']*["'][^>]*><\/script>/gi,
  /<script[^>]*src=["']\/@vite-plugin-pwa\/pwa-entry-point-loaded[^"']*["'][^>]*><\/script>/gi,
  /<script[^>]*src=["']\/index\.tsx[^"']*["'][^>]*><\/script>/gi
];
const FIRST_DOC_TAG = /<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>]|<style[\s>]|<div[\s>]|<section[\s>]|<main[\s>]/i;
const NORMALIZED_HTML_CACHE_MAX = 80;
const normalizedHtmlCache = new Map<string, string>();
const ALLOWED_TAGS = new Set([
  'div', 'section', 'article', 'main', 'header', 'footer', 'aside', 'nav',
  'p', 'span', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'button', 'pre', 'code', 'blockquote', 'img', 'br', 'hr',
  'strong', 'em', 'b', 'i', 'u', 's', 'small', 'mark',
  'table', 'thead', 'tbody', 'tr', 'th', 'td'
]);
const COMMON_ATTRS = new Set(['class', 'title', 'role']);
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading', 'decoding', 'referrerpolicy']),
  button: new Set(['type'])
};
const SAFE_STYLE_PROPS = new Set([
  'color', 'background-color', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'text-align',
  'line-height', 'letter-spacing', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border', 'border-radius',
  'display', 'gap', 'flex', 'flex-direction', 'justify-content', 'align-items', 'grid-template-columns',
  'width', 'max-width', 'min-width', 'height', 'max-height', 'min-height', 'white-space', 'word-break',
  'overflow', 'opacity', 'box-shadow'
]);
const PREVIEW_BLOCKED_TAGS = new Set(['iframe', 'object', 'embed']);
const PREVIEW_HEAD_TAGS = new Set(['style', 'meta', 'title', 'link']);
const PREVIEW_URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'poster']);

const normalizeHtmlInputText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'bigint') return String(value);
  return '';
};

const stripCodeFenceAndXmlDecl = (input: string): string => (
  input
    .replace(/```(?:html|xml)?\s*/gi, '')
    .replace(/```/g, '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .trim()
);

const stripDevRuntimeAssets = (source: string): string => {
  let next = source;
  DEV_RUNTIME_PATTERNS.forEach((pattern) => {
    next = next.replace(pattern, '');
  });
  return next.replace(/<base[^>]*>/gi, '');
};

const trimNonDocumentPrefix = (source: string): string => {
  const firstDocTagIdx = source.search(FIRST_DOC_TAG);
  return firstDocTagIdx > 0 ? source.slice(firstDocTagIdx) : source;
};

const decodeHtmlEntities = (input: string): string => {
  if (!/&(?:lt|gt|amp|quot|#39);/i.test(input)) return input;
  if (typeof DOMParser === 'undefined') return input;
  const parsed = new DOMParser().parseFromString(`<!doctype html><body>${input}`, 'text/html');
  return String(parsed.body.textContent || input);
};

const normalizeHtmlSource = (raw: string): string => {
  const cleaned = trimNonDocumentPrefix(stripDevRuntimeAssets(stripCodeFenceAndXmlDecl(raw)));
  if (!cleaned) return '';
  const hasRawTag = HTML_GENERIC_TAG.test(cleaned);
  const hasEscapedTag = ESCAPED_HTML_MARKER.test(cleaned);
  if (!hasRawTag && hasEscapedTag) {
    return decodeHtmlEntities(cleaned).trim();
  }
  return cleaned;
};

const toSafeUrl = (url: string): string | null => {
  const value = String(url || '').trim();
  if (!value) return null;
  if (value.startsWith('#')) return value;
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  if (/^data:image\//i.test(value)) return value;
  return null;
};

const toSafePreviewUrl = (url: string): string | null => {
  const value = String(url || '').trim();
  if (!value) return null;
  if (/^(https?:|mailto:|tel:|ftp:|blob:|file:)/i.test(value)) return value;
  if (/^\/\//.test(value)) return value;
  if (/^data:(image|audio|video|font|application\/(pdf|json|xml))/i.test(value)) return value;
  if (/^(\/|\.\/|\.\.\/)/.test(value)) return value;
  return null;
};

const sanitizeLooseInlineStyle = (styleText: string): string => {
  const value = String(styleText || '').trim();
  if (!value) return '';
  if (/expression\s*\(/i.test(value)) return '';
  if (/javascript\s*:/i.test(value)) return '';
  return value;
};

const sanitizeInlineStyle = (styleText: string): string => {
  const safeRules: string[] = [];
  styleText.split(';').forEach((rule) => {
    const pair = rule.split(':');
    if (pair.length < 2) return;
    const prop = String(pair[0] || '').trim().toLowerCase();
    const value = String(pair.slice(1).join(':') || '').trim();
    if (!prop || !value || !SAFE_STYLE_PROPS.has(prop)) return;
    if (/url\(|expression\(|javascript:/i.test(value)) return;
    safeRules.push(`${prop}:${value}`);
  });
  return safeRules.join(';');
};

const sanitizeStyleTagText = (styleText: string): string => (
  String(styleText || '')
    .replace(/@import[\s\S]*?;/gi, '')
    .replace(/url\(\s*(['"]?)javascript:[\s\S]*?\1\s*\)/gi, '')
    .replace(/expression\s*\(/gi, '')
);

const isAllowedAttribute = (tag: string, attr: string): boolean => {
  if (COMMON_ATTRS.has(attr)) return true;
  if (attr === 'style') return true;
  if (attr.startsWith('data-') || attr.startsWith('aria-')) return true;
  const tagSet = TAG_ATTRS[tag];
  return !!tagSet?.has(attr);
};

const sanitizeNode = (node: Node, doc: Document): Node | null => {
  if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent || '');
  if (!(node instanceof Element)) return null;
  const tag = node.tagName.toLowerCase();
  const children = Array.from(node.childNodes).map((child) => sanitizeNode(child, doc)).filter(Boolean) as Node[];
  if (!ALLOWED_TAGS.has(tag)) {
    const fragment = doc.createDocumentFragment();
    children.forEach((child) => fragment.appendChild(child));
    return fragment;
  }
  const safeElement = doc.createElement(tag);
  Array.from(node.attributes).forEach((attr) => {
    const name = attr.name.toLowerCase();
    if (name.startsWith('on') || !isAllowedAttribute(tag, name)) return;
    if (name === 'style') {
      const safeStyle = sanitizeInlineStyle(attr.value);
      if (safeStyle) safeElement.setAttribute('style', safeStyle);
      return;
    }
    if (name === 'href' || name === 'src') {
      const safeUrl = toSafeUrl(attr.value);
      if (safeUrl) safeElement.setAttribute(name, safeUrl);
      return;
    }
    safeElement.setAttribute(name, attr.value);
  });
  if (tag === 'a') {
    safeElement.setAttribute('rel', 'noopener noreferrer');
    if (!safeElement.getAttribute('target')) safeElement.setAttribute('target', '_blank');
  }
  children.forEach((child) => safeElement.appendChild(child));
  return safeElement;
};

const sanitizePreviewAttributes = (node: Element, target: Element): void => {
  Array.from(node.attributes).forEach((attr) => {
    const name = attr.name.toLowerCase();
    if (name.startsWith('on')) return;
    if (name === 'style') {
      const safeStyle = sanitizeLooseInlineStyle(attr.value);
      if (safeStyle) target.setAttribute('style', safeStyle);
      return;
    }
    if (PREVIEW_URL_ATTRS.has(name)) {
      const safeUrl = toSafePreviewUrl(attr.value);
      if (safeUrl) target.setAttribute(name, safeUrl);
      return;
    }
    target.setAttribute(name, attr.value);
  });
};

const sanitizePreviewNode = (node: Node, doc: Document, allowScripts: boolean): Node | null => {
  if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent || '');
  if (!(node instanceof Element)) return null;
  const tag = node.tagName.toLowerCase();
  if (tag === 'script' && !allowScripts) return null;
  if (PREVIEW_BLOCKED_TAGS.has(tag)) return null;
  if (tag === 'meta') {
    const httpEquiv = String(node.getAttribute('http-equiv') || '').trim().toLowerCase();
    if (httpEquiv === 'refresh') return null;
  }
  if (tag === 'style') {
    const styleEl = doc.createElement('style');
    styleEl.textContent = sanitizeStyleTagText(node.textContent || '');
    return styleEl;
  }
  const safeElement = doc.createElement(tag);
  sanitizePreviewAttributes(node, safeElement);
  Array.from(node.childNodes).forEach((child) => {
    const safeChild = sanitizePreviewNode(child, doc, allowScripts);
    if (safeChild) safeElement.appendChild(safeChild);
  });
  if (tag === 'a') {
    const href = String(safeElement.getAttribute('href') || '').trim();
    if (href) {
      safeElement.setAttribute('data-preview-href', href);
      safeElement.removeAttribute('href');
    }
    safeElement.setAttribute('rel', 'noopener noreferrer');
    safeElement.setAttribute('target', '_self');
  }
  if (tag === 'area') {
    const href = String(safeElement.getAttribute('href') || '').trim();
    if (href) safeElement.setAttribute('data-preview-href', href);
    safeElement.removeAttribute('href');
  }
  if (tag === 'form') {
    if (safeElement.hasAttribute('action')) {
      safeElement.setAttribute('data-preview-action', String(safeElement.getAttribute('action') || ''));
      safeElement.removeAttribute('action');
    }
  }
  if (tag === 'iframe') {
    if (!safeElement.getAttribute('sandbox')) {
      safeElement.setAttribute('sandbox', 'allow-forms allow-same-origin');
    }
    if (!safeElement.getAttribute('loading')) {
      safeElement.setAttribute('loading', 'lazy');
    }
    safeElement.setAttribute('referrerpolicy', 'no-referrer');
  }
  return safeElement;
};

const buildPreviewHeadHtml = (parsed: Document, safeDoc: Document, allowScripts: boolean): string => {
  const fragment = safeDoc.createDocumentFragment();
  Array.from(parsed.head.childNodes).forEach((node) => {
    if (!(node instanceof Element)) return;
    const tag = node.tagName.toLowerCase();
    if (!PREVIEW_HEAD_TAGS.has(tag)) return;
    const safeNode = sanitizePreviewNode(node, safeDoc, allowScripts);
    if (safeNode) fragment.appendChild(safeNode);
  });
  const holder = safeDoc.createElement('div');
  holder.appendChild(fragment);
  return holder.innerHTML;
};

const getCachedNormalizedHtml = (cacheKey: string): string | null => {
  if (!normalizedHtmlCache.has(cacheKey)) return null;
  const hit = normalizedHtmlCache.get(cacheKey) || '';
  normalizedHtmlCache.delete(cacheKey);
  normalizedHtmlCache.set(cacheKey, hit);
  return hit;
};

const setCachedNormalizedHtml = (cacheKey: string, value: string): void => {
  if (normalizedHtmlCache.has(cacheKey)) {
    normalizedHtmlCache.delete(cacheKey);
  }
  normalizedHtmlCache.set(cacheKey, value);
  if (normalizedHtmlCache.size <= NORMALIZED_HTML_CACHE_MAX) return;
  const oldestKey = normalizedHtmlCache.keys().next().value;
  if (!oldestKey) return;
  normalizedHtmlCache.delete(oldestKey);
};

export const isLikelyHtmlContent = (raw: unknown): boolean => {
  const text = normalizeHtmlInputText(raw).trim();
  if (!text) return false;
  if (ESCAPED_HTML_MARKER.test(text)) return true;
  if (HTML_DOC_MARKER.test(text)) return true;
  if (HTML_COMPLEX_TAG.test(text)) return true;
  if (HTML_PAIRED_TAG.test(text)) return true;
  if (HTML_SELF_CLOSING_TAG.test(text)) return true;
  return HTML_GENERIC_TAG.test(text);
};

export const normalizeHtmlMessageContent = (raw: unknown, messageId: string): string => {
  const source = normalizeHtmlInputText(raw).trim();
  if (!source) return '';
  const cacheKey = `${messageId}::${source}`;
  const cached = getCachedNormalizedHtml(cacheKey);
  if (cached !== null) return cached;
  const normalized = normalizeHtmlSource(source);
  if (!normalized) return '';
  if (typeof DOMParser === 'undefined') {
    throw new Error('DOMParser is unavailable for rich-text HTML rendering');
  }
  const parsed = new DOMParser().parseFromString(normalized, 'text/html');
  const sourceRoot = parsed.body;
  const safeDoc = document.implementation.createHTMLDocument('chat-rich-text');
  const safeRoot = safeDoc.createElement('div');
  Array.from(sourceRoot.childNodes).forEach((node) => {
    const safeNode = sanitizeNode(node, safeDoc);
    if (safeNode) safeRoot.appendChild(safeNode);
  });
  const result = safeRoot.innerHTML;
  setCachedNormalizedHtml(cacheKey, result);
  return result;
};

export const buildHtmlPreviewSrcDoc = (
  raw: unknown,
  messageId: string,
  options?: { allowScripts?: boolean }
): string => {
  const source = normalizeHtmlInputText(raw).trim();
  if (!source) return '';
  const allowScripts = options?.allowScripts === true;
  const normalized = normalizeHtmlSource(source);
  if (!normalized) return '';
  if (typeof DOMParser === 'undefined') {
    throw new Error('DOMParser is unavailable for HTML preview rendering');
  }
  const parsed = new DOMParser().parseFromString(normalized, 'text/html');
  const safeDoc = document.implementation.createHTMLDocument(`chat-html-preview-${messageId}`);
  const safeBody = safeDoc.createElement('body');
  Array.from(parsed.body.childNodes).forEach((node) => {
    const safeNode = sanitizePreviewNode(node, safeDoc, allowScripts);
    if (safeNode) safeBody.appendChild(safeNode);
  });
  const headHtml = buildPreviewHeadHtml(parsed, safeDoc, allowScripts);
  const baseStyle = '<style>html,body{margin:0;padding:0}body{font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#1f2329;background:#fff}body>:first-child{margin-top:0!important}body>:last-child{margin-bottom:0!important}img,video,table{max-width:100%}*{box-sizing:border-box}</style>';
  const layoutGuardStyle = '<style>body{display:block!important;min-height:0!important;height:auto!important;align-items:initial!important;justify-content:flex-start!important;background:#fff!important;overflow:auto!important}html{overflow:auto!important}body>*{height:auto!important;min-height:0!important;max-height:none!important}[style*="vh"]{height:auto!important;min-height:0!important;max-height:none!important}</style>';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${baseStyle}${headHtml}${layoutGuardStyle}</head>${safeBody.outerHTML}</html>`;
};
