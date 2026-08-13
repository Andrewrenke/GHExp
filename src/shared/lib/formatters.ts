// Intl.RelativeTimeFormat avoids pulling in date-fns (~40KB) for a single
// "updated 3 days ago" string, but Hermes on Android ships only part of
// Intl: NumberFormat and DateTimeFormat are present, RelativeTimeFormat is
// not. Constructing it unconditionally threw "undefined cannot be used as a
// constructor" at module load, which killed the app before first render, so
// feature-detect and fall back to a small English formatter.
type RelativeFormatter = {
  format(value: number, unit: Intl.RelativeTimeFormatUnit): string;
};

function formatRelativeFallback(value: number, unit: Intl.RelativeTimeFormatUnit): string {
  const abs = Math.abs(value);
  if (unit === 'day' && abs === 1) {
    return value < 0 ? 'yesterday' : 'tomorrow';
  }
  const plural = abs === 1 ? unit : `${unit}s`;
  return value < 0 ? `${abs} ${plural} ago` : `in ${abs} ${plural}`;
}

const RTF: RelativeFormatter =
  typeof Intl.RelativeTimeFormat === 'function'
    ? new Intl.RelativeTimeFormat('en', {numeric: 'auto'})
    : {format: formatRelativeFallback};

const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
];

export function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return '';
  }
  const diffSec = Math.round((then - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  for (const [unit, seconds] of UNITS) {
    if (abs >= seconds) {
      return RTF.format(Math.round(diffSec / seconds), unit);
    }
  }
  return RTF.format(diffSec, 'second');
}

// Compact large numbers ("12.3k") so a wide star count doesn't
// blow out the card layout on small screens.
const NF = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCount(n: number): string {
  return NF.format(n);
}
