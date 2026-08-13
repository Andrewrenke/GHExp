import {asyncStorage} from './persist';
import {syncStorage} from './storage';

// The README claims "a corrupt entry returns null instead of throwing on next
// launch" — a resilience guarantee that was never actually asserted.
describe('asyncStorage adapter', () => {
  beforeEach(() => {
    syncStorage.removeItem('probe');
  });

  it('returns null when nothing is stored', () => {
    expect(asyncStorage<{a: number}>().getItem('probe')).toBeNull();
  });

  it('round-trips a stored value', () => {
    const store = asyncStorage<{a: number}>();
    store.setItem('probe', {state: {a: 1}, version: 0});

    expect(store.getItem('probe')).toEqual({state: {a: 1}, version: 0});
  });

  // A truncated write (process killed mid-flush) must not brick the next launch.
  it('treats a corrupt entry as absent rather than throwing', () => {
    syncStorage.setItem('probe', '{"state":{"a":1'); // truncated JSON

    expect(() => asyncStorage<{a: number}>().getItem('probe')).not.toThrow();
    expect(asyncStorage<{a: number}>().getItem('probe')).toBeNull();
  });

  it('removes a stored value', () => {
    const store = asyncStorage<{a: number}>();
    store.setItem('probe', {state: {a: 1}, version: 0});
    store.removeItem('probe');

    expect(store.getItem('probe')).toBeNull();
  });
});
