// Background status checker for gateway connectivity
let gatewayStatus: boolean = false;
let lastChecked: number = 0;
const CHECK_INTERVAL = 5000; // 5 seconds

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
    gatewayStatus = await checkGatewayStatus();
    lastChecked = Date.now();
    console.log(`Gateway status checked: ${gatewayStatus ? 'online' : 'offline'}`);
  }, CHECK_INTERVAL);
  
  // Initial check
  checkGatewayStatus().then(status => {
    gatewayStatus = status;
    lastChecked = Date.now();
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