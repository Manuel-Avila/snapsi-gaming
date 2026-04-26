import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { useQueryClient } from "react-query";
import { initDatabase } from "@/db/database";
import * as SyncQueue from "@/db/syncQueueRepository";
import * as NetworkService from "@/services/networkService";
import * as SyncService from "@/services/syncService";

type OfflineContextType = {
  isDbReady: boolean;
  isOnline: boolean;
  pendingSyncCount: number;
  triggerSync: () => Promise<void>;
};

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isDbReady, setIsDbReady] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const queryClient = useQueryClient();
  const appState = useRef(AppState.currentState);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await SyncQueue.getQueueCount();
      setPendingSyncCount(count);
    } catch {}
  }, []);

  const onSyncComplete = useCallback(() => {
    queryClient.invalidateQueries(["posts"]);
    queryClient.invalidateQueries(["comments"]);
    queryClient.invalidateQueries(["gameReviews"]);
    queryClient.invalidateQueries(["myProfile"]);
    refreshPendingCount();
  }, [queryClient, refreshPendingCount]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await initDatabase();
        await SyncQueue.resetInProgressToRetry();
        if (mounted) {
          setIsDbReady(true);
          await refreshPendingCount();
        }
      } catch (error) {
        console.error("[OfflineProvider] DB init failed:", error);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [refreshPendingCount]);

  // Set up sync complete callback
  useEffect(() => {
    SyncService.setSyncCompleteCallback(onSyncComplete);
  }, [onSyncComplete]);

  // Monitor network state
  useEffect(() => {
    const unsubNetwork = NetworkService.startMonitoring();
    const unsubListener = NetworkService.subscribe((online) => {
      setIsOnline(online);
      if (online && isDbReady) {
        SyncService.runSync();
      }
    });

    return () => {
      unsubNetwork();
      unsubListener();
    };
  }, [isDbReady]);

  // Periodic sync
  useEffect(() => {
    if (!isDbReady) return;
    const stop = SyncService.startPeriodicSync();
    return stop;
  }, [isDbReady]);

  // Sync on app foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active" &&
        isDbReady
      ) {
        SyncService.runSync();
      }
      appState.current = nextState;
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [isDbReady]);

  // Initial sync when DB is ready
  useEffect(() => {
    if (isDbReady) {
      SyncService.runSync();
    }
  }, [isDbReady]);

  const triggerSync = useCallback(async () => {
    await SyncService.runSync();
  }, []);

  return (
    <OfflineContext.Provider
      value={{ isDbReady, isOnline, pendingSyncCount, triggerSync }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return context;
};
