import React, { useEffect } from "react";
import { Stack, useRouter, useSegments, SplashScreen } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "react-query";
import { useProfile } from "@/hooks/useProfile";

const protectedRoutes = ["(tabs)", "user"];

export default function RouteGuardLayout() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { getMyProfile } = useProfile();

  useQuery(["myProfile"], getMyProfile, {
    enabled: !!token,
  });

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const currentGroup = segments[0] as string;

    const inProtectedRoute = protectedRoutes.includes(currentGroup);

    if (!token && inProtectedRoute) {
      router.replace("/(auth)/login");
    } else if (token && currentGroup === "(auth)") {
      router.replace("/(tabs)/home");
    }
  }, [isLoading, token, segments, router]);

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {});
      }, 100);
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
