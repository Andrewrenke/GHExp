import {useSyncExternalStore} from 'react';
import {onlineManager} from '@tanstack/react-query';

// Connectivity has exactly one source of truth: the `onlineManager` that
// QueryProvider already wires to NetInfo. This hook used to open a *second*
// NetInfo subscription of its own, which meant two listeners, two sources that
// could disagree mid-flap, and a banner that could contradict whether Query
// thought it was online.
//
// `useSyncExternalStore` is the right primitive here — it subscribes, reads a
// snapshot, and handles tearing, without duplicating state into a useState.
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    onStoreChange => onlineManager.subscribe(onStoreChange),
    () => onlineManager.isOnline(),
  );
}
