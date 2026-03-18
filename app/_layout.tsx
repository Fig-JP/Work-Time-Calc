import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/lib/auth";

SplashScreen.preventAutoHideAsync().catch(() => {});

if (Platform.OS === "web" && typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("/Work-Time-Calc/sw.js").catch(() => {});
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="record/new" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="record/[id]" options={{ presentation: "modal", headerShown: false }} />
    </Stack>
  );
}

function KeyboardWrapper({ children }: { children: React.ReactNode }) {
  if (Platform.OS === "web") return <>{children}</>;
  try {
    const { KeyboardProvider } = require("react-native-keyboard-controller") as {
      KeyboardProvider: React.ComponentType<{ children: React.ReactNode }>;
    };
    return <KeyboardProvider>{children}</KeyboardProvider>;
  } catch {
    return <>{children}</>;
  }
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    feather: require("../assets/fonts/Feather.ttf"),
  });

  const splashHidden = useRef(false);

  const hideSplash = () => {
    if (!splashHidden.current) {
      splashHidden.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
  };

  useEffect(() => {
    if (fontsLoaded || fontError) {
      hideSplash();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const timer = setTimeout(hideSplash, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardWrapper>
                <RootLayoutNav />
              </KeyboardWrapper>
            </GestureHandlerRootView>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
