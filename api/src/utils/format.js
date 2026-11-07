export function roundTo(value, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function money(value) {
  return roundTo(Number(value) || 0, 2);
}

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function shareOf(part, total, digits = 1) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return roundTo(((Number(part) || 0) / total) * 100, digits);
}

export function articleFor(word) {
  return /^[aeiou]/i.test(String(word)) ? 'An' : 'A';
}
