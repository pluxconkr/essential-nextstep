/**
 * Online / offline watch. The app never blocks on the network: this only drives the OFFLINE banner
 * and when the sync queue tries again.
 */
import * as Network from 'expo-network';
import { Platform } from 'react-native';

import { actions } from '@/store/appStore';

export function startNetworkWatch(onChange?: (online: boolean) => void): () => void {
  if (Platform.OS === 'web') {
    const update = () => {
      const online = typeof navigator === 'undefined' ? true : navigator.onLine;
      actions.setNetwork({ online });
      onChange?.(online);
    };
    update();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', update);
      window.addEventListener('offline', update);
      return () => {
        window.removeEventListener('online', update);
        window.removeEventListener('offline', update);
      };
    }
    return () => {};
  }
  let sub: { remove(): void } | null = null;
  try {
    sub = Network.addNetworkStateListener((s) => {
      const online = Boolean(s.isConnected && (s.isInternetReachable ?? true));
      actions.setNetwork({ online });
      onChange?.(online);
    });
    void Network.getNetworkStateAsync()
      .then((s) => {
        const online = Boolean(s.isConnected && (s.isInternetReachable ?? true));
        actions.setNetwork({ online });
        onChange?.(online);
      })
      .catch(() => actions.setNetwork({ online: null }));
  } catch {
    actions.setNetwork({ online: null });
  }
  return () => sub?.remove();
}
