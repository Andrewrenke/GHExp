import {useFavoritesStore} from './useFavoritesStore';

// Persist middleware defers hydration to a promise on module load;
// resetting the in-memory state at the top of each test is enough
// for unit-testing the pure state transitions.
beforeEach(() => {
  useFavoritesStore.setState({favorites: []});
});

describe('useFavoritesStore', () => {
  it('starts empty', () => {
    expect(useFavoritesStore.getState().favorites).toEqual([]);
  });

  it('toggles a repo in and out of favorites', () => {
    const {toggle} = useFavoritesStore.getState();
    toggle('facebook/react-native');
    expect(useFavoritesStore.getState().favorites).toEqual(['facebook/react-native']);
    toggle('facebook/react-native');
    expect(useFavoritesStore.getState().favorites).toEqual([]);
  });

  it('newest favorite goes to the front', () => {
    const {toggle} = useFavoritesStore.getState();
    toggle('a/1');
    toggle('b/2');
    toggle('c/3');
    expect(useFavoritesStore.getState().favorites).toEqual(['c/3', 'b/2', 'a/1']);
  });

  it('isFavorite reflects toggles without a re-read of the whole array', () => {
    const {toggle, isFavorite} = useFavoritesStore.getState();
    expect(isFavorite('x/y')).toBe(false);
    toggle('x/y');
    // isFavorite is a getter that reads current state, so we must
    // re-select it after mutating — mirrors real component usage.
    expect(useFavoritesStore.getState().isFavorite('x/y')).toBe(true);
  });
});
