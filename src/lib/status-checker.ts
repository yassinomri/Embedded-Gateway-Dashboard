// Background status checker for gateway connectivity
let gatewayStatus: boolean = false;
let lastChecked: number = 0;
const CHECK_INTERVAL = 5000; // 5 seconds

// Add event system for status changes
type StatusListener = (status: boolean) => void;
const statusListeners: StatusListener[] = [];

// Function to check if gateway is online
const checkGatewayStatus = async (): Promise<boolean> => {
  try {
    // Try multiple endpoints to determine if gateway is online
    const endpoints = [
      "http://192.168.1.2/cgi-bin/ping.cgi",
      "http://192.168.1.2/cgi-bin/dashboard_data.cgi"
    ];
    
    // Try each endpoint
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          signal: AbortSignal.timeout(3000),
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Continue to next endpoint
        console.log(`Endpoint ${endpoint} check failed, trying next...`);
      }
    }
    
    // If we get here, all endpoints failed
    return false;
  } catch (error) {
    return false;
  }
};

// Start background checker
let checkerId: number | null = null;

export const startStatusChecker = () => {
  if (checkerId !== null) return; // Already running
  
  checkerId = window.setInterval(async () => {
    const newStatus = await checkGatewayStatus();
    const statusChanged = newStatus !== gatewayStatus;
    
    gatewayStatus = newStatus;
    lastChecked = Date.now();
    
    // Log status changes
    if (statusChanged) {
      console.log(`Gateway status changed: ${gatewayStatus ? 'online' : 'offline'}`);
      // Notify all listeners about the status change
      notifyStatusListeners();
    } else {
      console.log(`Gateway status checked: ${gatewayStatus ? 'online' : 'offline'}`);
    }
  }, CHECK_INTERVAL);
  
  // Initial check
  checkGatewayStatus().then(status => {
    gatewayStatus = status;
    lastChecked = Date.now();
    // Notify listeners on initial status
    notifyStatusListeners();
  });
};

export const stopStatusChecker = () => {
  if (checkerId !== null) {
    window.clearInterval(checkerId);
    checkerId = null;
  }
};

export const getGatewayStatus = (): { online: boolean, lastChecked: number } => {
  return { 
    online: gatewayStatus,
    lastChecked
  };
};

// Add subscription system for status changes
export const subscribeToStatusChanges = (callback: StatusListener): () => void => {
  statusListeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    const index = statusListeners.indexOf(callback);
    if (index !== -1) {
      statusListeners.splice(index, 1);
    }
  };
};

// Notify all listeners about status changes
const notifyStatusListeners = () => {
  statusListeners.forEach(listener => {
    try {
      listener(gatewayStatus);
    } catch (error) {
      console.error('Error in status listener:', error);
    }
  });
};

// Initialize the status checker at app startup
if (typeof window !== 'undefined') {
  startStatusChecker();
}
