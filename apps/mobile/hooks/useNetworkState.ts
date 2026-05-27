import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

export function useNetworkState() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const checkNetwork = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        if (isMounted) {
          setIsOffline(networkState.isConnected === false || networkState.isInternetReachable === false);
        }
      } catch (err) {
        console.warn('Network check failed:', err);
      }
    };

    checkNetwork();
    
    // Polling as a simple fallback, since expo-network doesn't have an event listener for reachability changes.
    const interval = setInterval(checkNetwork, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { isOffline };
}
