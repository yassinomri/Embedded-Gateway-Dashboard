import { useEffect, useState } from "react";
import { getPendingConfigs, removePendingConfig } from "@/lib/offline-config";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export function SyncManager({ autoSync = false }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [syncResult, setSyncResult] = useState({ success: 0, failed: 0 });
  const [systemOnline, setSystemOnline] = useState(false);

  // Check if system is online
  const checkOnlineStatus = async () => {
    try {
      const response = await fetch("http://192.168.1.1/cgi-bin/ping.cgi", {
        signal: AbortSignal.timeout(3000)
      });
      setSystemOnline(response.ok);
      return response.ok;
    } catch (error) {
      setSystemOnline(false);
      return false;
    }
  };

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
  }, [autoSync, syncing]);

  const syncConfigs = async () => {
    setSyncing(true);
    const configs = getPendingConfigs();
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      try {
        const url = `http://192.168.1.1/cgi-bin/${config.endpoint}`;
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

    setSyncResult({ success: successCount, failed: failedCount });
    setShowAlert(true);
    setSyncing(false);
    setPendingCount(getPendingConfigs().length);
  };

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
