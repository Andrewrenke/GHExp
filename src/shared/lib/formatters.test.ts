import {formatCount, formatRelative} from './formatters';

// These pure functions were untested despite carrying the one genuine
// platform-compatibility workaround in the codebase: Hermes on Android ships
// Intl.NumberFormat and Intl.DateTimeFormat but NOT Intl.RelativeTimeFormat.
// Constructing it unconditionally threw "undefined cannot be used as a
// constructor" at module load and killed the app before first render.

describe('formatCount', () => {
  it('compacts large numbers', () => {
    expect(formatCount(12_345)).toBe('12.3K');
  });

  it('leaves small numbers alone', () => {
    expect(formatCount(42)).toBe('42');
  });
});

describe('formatRelative', () => {
  const now = new Date('2026-08-13T12:00:00Z');

  it('formats hours in the past', () => {
    expect(formatRelative('2026-08-13T09:00:00Z', now)).toMatch(/3 hours ago/);
  });

  it('formats days in the past', () => {
    expect(formatRelative('2026-08-11T12:00:00Z', now)).toMatch(/2 days ago/);
  });

  it('returns an empty string for an unparseable date', () => {
    expect(formatRelative('not-a-date', now)).toBe('');
  });
});

// Simulate the Android/Hermes runtime by removing RelativeTimeFormat, then
// re-importing the module so its top-level feature detection runs again.
describe('formatRelative without Intl.RelativeTimeFormat (Hermes on Android)', () => {
  // TS types `Intl.RelativeTimeFormat` as a required, read-only member, so a
  // mutable view is needed to emulate a runtime that genuinely lacks it.
  const intl: {RelativeTimeFormat?: typeof Intl.RelativeTimeFormat} = Intl;
  const original = intl.RelativeTimeFormat;

  afterEach(() => {
    intl.RelativeTimeFormat = original;
    jest.resetModules();
  });

  it('loads the module without throwing and still formats', () => {
    delete intl.RelativeTimeFormat;
    jest.resetModules();

    // The original bug was at module *load*, so requiring must not throw.
    // A dynamic require is the point here: it re-runs the module's top-level
    // feature detection after resetModules, which a static import cannot do.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const reloaded = require('./formatters') as typeof import('./formatters');
    const now = new Date('2026-08-13T12:00:00Z');

    expect(reloaded.formatRelative('2026-08-13T09:00:00Z', now)).toBe('3 hours ago');
    expect(reloaded.formatRelative('2026-08-12T12:00:00Z', now)).toBe('yesterday');
  });
});
