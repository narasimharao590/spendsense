export function cx(...values) {
  return values
    .flat(Infinity)
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim())
    .join(' ');
}
