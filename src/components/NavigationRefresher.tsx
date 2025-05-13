import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { registerNavigationRefresher, unregisterNavigationRefresher, getGatewayStatus } from '@/lib/status-checker';

export function NavigationRefresher() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastPathRef = useRef(location.pathname);
  const lastNavigationTimeRef = useRef(0);
  
  useEffect(() => {
    // Check if path has changed but we're still on the same component
    if (location.pathname !== lastPathRef.current) {
      console.log(`Path changed from ${lastPathRef.current} to ${location.pathname}, but component didn't update`);
      
      // Prevent multiple navigations in quick succession
      const now = Date.now();
      if (now - lastNavigationTimeRef.current > 2000) {
        lastNavigationTimeRef.current = now;
        
        // Force navigation to the new path using window.location
        // This is a more direct approach that bypasses React Router
        const timeoutId = setTimeout(() => {
          console.log(`Forcing navigation to ${location.pathname}`);
          window.location.href = location.pathname;
        }, 100);
        
        return () => clearTimeout(timeoutId);
      }
    }
    
    // Update the last path ref
    lastPathRef.current = location.pathname;
    
    // Create a function to force navigation refresh
    const refreshNavigation = () => {
      // Prevent multiple refreshes in quick succession
      const now = Date.now();
      if (now - lastNavigationTimeRef.current < 2000) {
        console.log('Skipping navigation refresh - too soon');
        return;
      }
      
      console.log('Navigation refresher triggered');
      lastNavigationTimeRef.current = now;
      
      // If we're trying to navigate away from current page, force it
      if (window.location.pathname !== location.pathname) {
        console.log(`Detected navigation mismatch: window=${window.location.pathname}, router=${location.pathname}`);
        window.location.href = location.pathname;
      }
    };
    
    // Register the refresher
    registerNavigationRefresher(refreshNavigation);
    
    // Cleanup on unmount
    return () => {
      unregisterNavigationRefresher();
    };
  }, [navigate, location]);
  
  return null;
}


