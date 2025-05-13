import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { registerNavigationRefresher, unregisterNavigationRefresher } from '@/lib/status-checker';

export function NavigationRefresher() {
  const location = useLocation();
  const lastPathRef = useRef(location.pathname);
  
  useEffect(() => {
    // Update the last path ref
    lastPathRef.current = location.pathname;
    
    // Create a simplified navigation refresher that just logs issues
    const refreshNavigation = () => {
      console.log('Navigation refresher triggered');
      
      // Log navigation mismatches but don't force reload
      if (window.location.pathname !== location.pathname) {
        console.log(`Detected navigation mismatch: window=${window.location.pathname}, router=${location.pathname}`);
        // No forced navigation - let React Router handle it naturally
      }
    };
    
    // Register the refresher
    registerNavigationRefresher(refreshNavigation);
    
    // Cleanup on unmount
    return () => {
      unregisterNavigationRefresher();
    };
  }, [location]);
  
  return null;
}



