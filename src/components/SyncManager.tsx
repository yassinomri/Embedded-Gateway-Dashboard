import { useCallback, useEffect, useState } from "react";
import { getPendingConfigs, removePendingConfig } from "@/lib/offline-config";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface SyncManagerProps {
  autoSync?: boolean;
  onSyncComplete?: (result: { success: number; failed: number }) => void;
}

export function SyncManager({ autoSync = false, onSyncComplete }: SyncManagerProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [syncResult, setSyncResult] = useState({ success: 0, failed: 0 });
  const [, setSystemOnline] = useState(false);

  // Check if system is online with improved reliability
  const checkOnlineStatus = async () => {
    try {
      // Try multiple endpoints to determine if system is online
      const endpoints = [
        "http://192.168.1.2/cgi-bin/ping.cgi",
        "http://192.168.1.2/cgi-bin/dashboard_data.cgi",
        "http://192.168.1.2/cgi-bin/network.cgi?option=get",
        "http://192.168.1.2/cgi-bin/wireless.cgi?option=get",
        "http://192.168.1.2/cgi-bin/dhcp_dns.cgi?option=get",
        "http://192.168.1.2/cgi-bin/system_info.cgi",
        "http://192.168.1.2/cgi-bin/firewall.cgi?option=get",
        "http://192.168.1.2/cgi-bin/reboot.cgi"
      ];
      
      // Try each endpoint
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            signal: AbortSignal.timeout(3000),
            // Add cache busting
            cache: 'no-store',
            headers: {
              'Pragma': 'no-cache'
            }
          });
          
          if (response.ok) {
            setSystemOnline(true);
            return true;
          }
        } catch (endpointError) {
          // Continue to next endpoint
          console.log(`Endpoint ${endpoint} check failed, trying next...`);
        }
      }
      
      // If we get here, all endpoints failed
      setSystemOnline(false);
      return false;
    } catch (error) {
      setSystemOnline(false);
      return false;
    }
  };

  const syncConfigs = useCallback(async () => {
    setSyncing(true);
    const configs = getPendingConfigs();
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      try {
        const url = `http://192.168.1.2/cgi-bin/${config.endpoint}`;
        const response = await fetch(url, {
          method: config.method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config.data),
        });

        if (response.ok) {
          removePendingConfig(i - successCount - failedCount);
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        failedCount++;
      }
    }

    const result = { success: successCount, failed: failedCount };
    setSyncResult(result);
    setShowAlert(true);
    setSyncing(false);
    setPendingCount(getPendingConfigs().length);
    
    // Call the onSyncComplete callback if provided
    if (onSyncComplete) {
      onSyncComplete(result);
    }
    
    return result;
  }, [onSyncComplete]);

  useEffect(() => {
    // Initial check for pending configs
    const count = getPendingConfigs().length;
    setPendingCount(count);
    
    // Check online status
    checkOnlineStatus();
    
    // Set up interval to check online status
    const intervalId = setInterval(async () => {
      const isOnline = await checkOnlineStatus();
      
      // Auto-sync if we're online, have pending configs, and autoSync is enabled
      if (isOnline && getPendingConfigs().length > 0 && autoSync && !syncing) {
        syncConfigs();
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [autoSync, syncConfigs, syncing]);

  // Make syncConfigs available globally for other components to use
  (window as Window & typeof globalThis & { syncPendingConfigs: () => Promise<{success: number; failed: number}> }).syncPendingConfigs = syncConfigs;

  if (pendingCount === 0) return null;

  return (
    <>
      {showAlert && (
        <Alert className="mb-4">
          <AlertTitle>Sync Results</AlertTitle>
          <AlertDescription>
            Successfully applied {syncResult.success} configurations.
            {syncResult.failed > 0 && ` Failed to apply ${syncResult.failed} configurations.`}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="mb-4 p-3 border rounded-md bg-amber-50 flex items-center justify-between">
        <span>You have {pendingCount} pending configuration changes</span>
        <Button 
          onClick={syncConfigs} 
          disabled={syncing}
          size="sm"
        >
          {syncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            "Sync Now"
          )}
        </Button>
      </div>
    </>
  );
}
