import { COLORS } from "@/constants/theme";
import { SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "react-query";
import Toast from "react-native-toast-message";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { toastConfig } from "@/components/ui/ToastConfig";
import { AuthProvider } from "@/context/AuthContext";
import { OfflineProvider } from "@/context/OfflineContext";
import RouteGuardLayout from "@/components/RouteGuardLayout";

const queryClient = new QueryClient();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <OfflineProvider>
        <AuthProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
              <SafeAreaView
                style={{ flex: 1, backgroundColor: COLORS.background }}
              >
                <StatusBar style="light" />
                <RouteGuardLayout />
              </SafeAreaView>
              <Toast config={toastConfig} />
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </AuthProvider>
      </OfflineProvider>
    </QueryClientProvider>
  );
}
