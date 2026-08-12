// Intl.RelativeTimeFormat ships with modern JS runtimes (Hermes included
// via full-ICU on RN 0.75+). Using it avoids pulling in date-fns
// (~40KB) for a single "updated 3 days ago" string.

const RTF = new Intl.RelativeTimeFormat('en', {numeric: 'auto'});

const UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
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
