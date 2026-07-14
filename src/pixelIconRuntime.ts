const PIXEL_ICON_PATHS: Record<string, string> = {
  'fa-comment': 'M1 1h14v9H8l-3 3v-3H1z',
  'fa-address-book': 'M3 1h9v14H3zM12 4h3v2h-3zM12 8h3v2h-3zM12 12h3v2h-3z',
  'fa-compass': 'M7 1h2v2h2v2h2v2h2v2h-2v2h-2v2H9v2H7v-2H5v-2H3V9H1V7h2V5h2V3h2z',
  'fa-user': 'M5 2h6v4H5zM3 8h10v6H3z',
  'fa-gear': 'M6 1h4v2h2v2h2v4h-2v2h-2v2H6v-2H4V9H2V5h2V3h2zM6 6h4v4H6z',
  'fa-plus': 'M6 1h4v5h5v4h-5v5H6v-5H1V6h5z',
  'fa-circle-plus': 'M6 1h4v5h5v4h-5v5H6v-5H1V6h5z',
  'fa-face-smile': 'M2 2h12v12H2zM5 6h2v2H5zM9 6h2v2H9zM5 10h6v2H5z',
  'fa-microphone': 'M5 1h6v8H5zM3 9h2v2h6V9h2v3H9v3H7v-3H3z',
  'fa-keyboard': 'M1 3h14v10H1zM3 6h2v2H3zM6 6h2v2H6zM9 6h2v2H9zM12 6h2v2h-2zM3 9h10v2H3z',
  'fa-paper-plane': 'M1 8l14-6-4 12-3-4-4-2z',
  'fa-arrow-left': 'M7 2L1 8l6 6V9h8V7H7z',
  'fa-chevron-left': 'M7 2L1 8l6 6V9h8V7H7z',
  'fa-chevron-right': 'M9 2l6 6-6 6V9H1V7h8z',
  'fa-ellipsis': 'M2 6h3v4H2zM6 6h4v4H6zM11 6h3v4h-3z',
  'fa-ellipsis-h': 'M2 6h3v4H2zM6 6h4v4H6zM11 6h3v4h-3z',
  'fa-code-branch': 'M3 1h4v4H3zM9 6h4v4H9zM9 11h4v4H9zM7 3h2v2H7zM7 8h2v2H7zM7 10h2v2H7z',
  'fa-star': 'M7 1h2v3h3v2h3v2h-3v3h-2v3H7v-3H4V8H1V6h3V4h3z',
  'fa-trash': 'M3 2h10v2H3zM4 4h8v10H4z',
  'fa-envelope': 'M1 3h14v10H1zM2 4l6 4 6-4v2l-6 4-6-4z',
  'fa-image': 'M1 2h14v12H1zM3 5h3v3H3zM7 11l2-3 2 2 2-3 2 4z',
  'fa-dice': 'M2 2h12v12H2zM4 4h2v2H4zM10 10h2v2h-2z',
  'fa-phone': 'M3 2h4v2H5v2h2v2H5v2h2v2H3zM9 6h4v8H9z',
  'fa-location-dot': 'M6 2h4v2h2v2h-2v2h-4V6H4V4h2zM7 10h2v4H7z',
  'fa-gift': 'M1 6h14v2H1zM2 8h5v7H2zM9 8h5v7H9zM4 2h3v2H4zM9 2h3v2H9z',
  'fa-arrow-right-arrow-left': 'M1 4h10V2l4 3-4 3V6H1zM15 12H5v2l-4-3 4-3v2h10z',
  'fa-heart': 'M4 2h3v2h2V2h3v2h2v3h-2v2h-2v2H7V9H5V7H3V4h1z',
  'fa-folder-open': 'M1 4h5l2 2h7v2H1zM1 8h14v6H1z'
};

const ICON_HOST_CLASS = 'pixel-global-icon-host';
const ICON_SVG_CLASS = 'pixel-global-icon-svg';
let iconObserver: MutationObserver | null = null;

const FA_UTILITY_CLASSES = new Set([
  'fa-solid',
  'fa-regular',
  'fa-brands',
  'fa-fw',
  'fa-spin',
  'fa-pulse',
  'fa-beat',
  'fa-fade',
  'fa-bounce',
  'fa-flip',
  'fa-shake',
  'fa-spin-pulse',
  'fa-spin-reverse',
  'fa-rotate-90',
  'fa-rotate-180',
  'fa-rotate-270',
  'fa-flip-horizontal',
  'fa-flip-vertical',
  'fa-flip-both',
  'fa-inverse'
]);

const isUtilityFaClass = (name: string): boolean => {
  if (!name.startsWith('fa-')) return false;
  if (FA_UTILITY_CLASSES.has(name)) return true;
  if (/^fa-\d+x$/.test(name)) return true;
  if (/^fa-(xs|sm|lg|xl|2xl)$/.test(name)) return true;
  if (/^fa-(pull-left|pull-right|border)$/.test(name)) return true;
  return false;
};

const extractFaIconKey = (el: HTMLElement): string => {
  const classes = Array.from(el.classList);
  const direct = classes.find((name) => !!PIXEL_ICON_PATHS[name]);
  if (direct) return direct;
  return classes.find((name) => name.startsWith('fa-') && !isUtilityFaClass(name)) || '';
};

const hashIconKey = (text: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const buildFallbackPath = (key: string): string => {
  const hash = hashIconKey(key);
  const cells: string[] = [
    'M1 1h14v2H1z',
    'M1 13h14v2H1z',
    'M1 3h2v10H1z',
    'M13 3h2v10h-2z',
    'M4 4h8v1H4z',
    'M4 11h8v1H4z'
  ];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const bit = (hash >> (row * 4 + col)) & 1;
      if (bit) cells.push(`M${3 + col * 2} ${5 + row * 2}h2v2h-2z`);
    }
  }
  return cells.join('');
};

const resolvePixelPath = (key: string): string => PIXEL_ICON_PATHS[key] || buildFallbackPath(key);

const renderPixelIcon = (el: HTMLElement, key: string) => {
  const target = el as HTMLElement & { dataset: DOMStringMap };
  if (target.dataset.pixelIconKey === key && target.querySelector(`.${ICON_SVG_CLASS}`)) return;
  target.dataset.pixelIconKey = key;
  target.classList.add(ICON_HOST_CLASS);
  const path = resolvePixelPath(key);
  target.innerHTML = `<svg class="${ICON_SVG_CLASS}" viewBox="0 0 16 16" aria-hidden="true"><path d="${path}"/></svg>`;
};

const clearPixelIcon = (el: HTMLElement) => {
  const target = el as HTMLElement & { dataset: DOMStringMap };
  if (!target.classList.contains(ICON_HOST_CLASS)) return;
  target.classList.remove(ICON_HOST_CLASS);
  delete target.dataset.pixelIconKey;
  target.innerHTML = '';
};

const processPixelIcons = () => {
  const elements = Array.from(document.querySelectorAll<HTMLElement>('i.fa-solid, i.fa-regular, i.fa-brands'));
  for (const el of elements) {
    const key = extractFaIconKey(el);
    if (!key) {
      clearPixelIcon(el);
      continue;
    }
    renderPixelIcon(el, key);
  }
};

const ensureIconObserver = () => {
  if (iconObserver || typeof MutationObserver === 'undefined' || !document.body) return;
  iconObserver = new MutationObserver(() => processPixelIcons());
  iconObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
};

const disconnectIconObserver = () => {
  if (!iconObserver) return;
  iconObserver.disconnect();
  iconObserver = null;
};

export const syncGlobalPixelIcons = (enabled: boolean) => {
  if (typeof document === 'undefined') return;
  if (!enabled) {
    disconnectIconObserver();
    const patched = document.querySelectorAll<HTMLElement>(`i.${ICON_HOST_CLASS}`);
    patched.forEach((el) => clearPixelIcon(el));
    return;
  }
  processPixelIcons();
  ensureIconObserver();
};
