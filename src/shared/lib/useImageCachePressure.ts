import {useEffect} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {Image} from 'expo-image';

// Scrolling deep into a 1000-result search decodes a lot of avatars. expo-image
// keeps decoded bitmaps in an in-memory cache sized as a fraction of the heap,
// and that memory cache — not the disk cache — is what pushes a low-memory
// device toward an OOM kill.
//
// Note on scope: expo-image deliberately exposes no JS API for a cache byte
// budget (only `clearMemoryCache`, `clearDiskCache` and `prefetch`), so an
// explicit LRU size cannot be configured from here. What we *can* do is drop
// decoded bitmaps at the two moments the platform tells us memory is tight.
// The disk cache is untouched, so re-entering the app repaints from disk
// without another network round-trip.
export function useImageCachePressure(): void {
  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      // Backgrounded: nothing on screen needs a decoded bitmap, and this is
      // when the OS is most likely to reclaim the process.
      if (status === 'background') {
        void Image.clearMemoryCache();
      }
    };

    const stateSub = AppState.addEventListener('change', onChange);
    // iOS only — Android surfaces no equivalent JS-visible trim callback.
    const memorySub = AppState.addEventListener('memoryWarning', () => {
      void Image.clearMemoryCache();
    });

    return () => {
      stateSub.remove();
      memorySub.remove();
    };
  }, []);
}
