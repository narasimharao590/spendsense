export const FALLBACK_CATEGORY_COLOR = '#64748b';

export const SERIES_COLORS = {
  income: '#059669',
  expense: '#e11d48',
  accent: '#10b981',
  accentSoft: '#a7f3d0',
  grid: '#e6e6e0',
  axis: '#a6aaa2',
};

export const CATEGORY_COLOR_OPTIONS = [
  { name: 'emerald', hex: '#10b981' },
  { name: 'green', hex: '#22c55e' },
  { name: 'teal', hex: '#14b8a6' },
  { name: 'lime', hex: '#84cc16' },
  { name: 'sky', hex: '#0ea5e9' },
  { name: 'blue', hex: '#3b82f6' },
  { name: 'violet', hex: '#8b5cf6' },
  { name: 'pink', hex: '#ec4899' },
  { name: 'rose', hex: '#f43f5e' },
  { name: 'orange', hex: '#f97316' },
  { name: 'amber', hex: '#f59e0b' },
  { name: 'slate', hex: '#64748b' },
  { name: 'brown', hex: '#92400e' },
];

const HEX_PATTERN = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;
const NAME_TO_HEX = new Map(CATEGORY_COLOR_OPTIONS.map((option) => [option.name, option.hex]));

function hexToRgb(value) {
  const hex = value.replace('#', '');
  const expanded =
    hex.length === 3
      ? hex
          .split('')
          .map((character) => character + character)
          .join('')
      : hex;

  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
}

function hashColorKey(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 1000003;
  }
  return hash % CATEGORY_COLOR_OPTIONS.length;
}

export function categoryColor(value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';

  if (HEX_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const byName = NAME_TO_HEX.get(trimmed.toLowerCase());
  if (byName) {
    return byName;
  }

  if (trimmed.length === 0) {
    return FALLBACK_CATEGORY_COLOR;
  }

  return CATEGORY_COLOR_OPTIONS[hashColorKey(trimmed.toLowerCase())].hex;
}

export function withAlpha(value, alpha = 0.14) {
  const [red, green, blue] = hexToRgb(categoryColor(value));

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function readableInk(value) {
  const [red, green, blue] = hexToRgb(categoryColor(value)).map((channel) => {
    const ratio = channel / 255;
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

  return luminance > 0.45 ? '#1e211f' : '#ffffff';
}
