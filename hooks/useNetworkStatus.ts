import { useOffline } from "@/context/OfflineContext";

export const useNetworkStatus = () => {
  const { isOnline, pendingSyncCount } = useOffline();
  return { isOnline, pendingSyncCount };
};
