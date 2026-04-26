import NetInfo, {
  NetInfoState,
  NetInfoSubscription,
} from "@react-native-community/netinfo";
import api from "@/api/apiClient";

let _isOnline = true;
let _subscription: NetInfoSubscription | null = null;
const _listeners: Set<(online: boolean) => void> = new Set();

const notifyListeners = (online: boolean) => {
  _isOnline = online;
  _listeners.forEach((cb) => cb(online));
};

export const startMonitoring = (): (() => void) => {
  _subscription = NetInfo.addEventListener((state: NetInfoState) => {
    const online = !!(state.isConnected && state.isInternetReachable !== false);
    notifyListeners(online);
  });
  return () => {
    _subscription?.();
    _subscription = null;
  };
};

export const subscribe = (cb: (online: boolean) => void): (() => void) => {
  _listeners.add(cb);
  return () => {
    _listeners.delete(cb);
  };
};

export const isOnline = (): boolean => _isOnline;

/**
 * Do a real HTTP ping to verify the backend is reachable,
 * not just that the device has a network connection.
 */
export const checkConnectivity = async (): Promise<boolean> => {
  try {
    await api.get("/", { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
};
