import {useEffect, useState} from 'react';
import NetInfo from '@react-native-community/netinfo';

// Small hook so the offline banner (and any future UI that cares
// about connectivity) doesn't each re-subscribe to NetInfo — one
// subscription per mount, cleaned up on unmount.
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setOnline(!!state.isConnected);
    });
    return () => unsub();
  }, []);
  return online;
}
