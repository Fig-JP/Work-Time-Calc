import { BlurView } from "expo-blur";
import { Tabs, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View, ActivityIndicator } from "react-native";
import { useAuth } from "@/lib/auth";
import Colors from "@/constants/colors";

const C = Colors.light;

function isGlassAvailable(): boolean {
  if (Platform.OS !== "ios") return false;
  try {
    return (require("expo-glass-effect") as { isLiquidGlassAvailable: () => boolean }).isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

function NativeTabLayout() {
  const { NativeTabs, Icon, Label } = require("expo-router/unstable-native-tabs") as {
    NativeTabs: any;
    Icon: any;
    Label: any;
  };
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>ホーム</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <Icon sf={{ default: "list.bullet", selected: "list.bullet" }} />
        <Label>履歴</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>設定</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function TabIcon({ name, color, size = 22 }: { name: string; color: string; size?: number }) {
  if (Platform.OS === "ios") {
    try {
      const { SymbolView } = require("expo-symbols") as { SymbolView: any };
      const sfMap: Record<string, string> = {
        home: "house",
        list: "list.bullet",
        settings: "gearshape",
      };
      if (sfMap[name]) {
        return <SymbolView name={sfMap[name]} tintColor={color} size={size} />;
      }
    } catch {}
  }
  return <Feather name={name as any} size={size} color={color} />;
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.tint,
        tabBarInactiveTintColor: C.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : C.backgroundSecondary,
          borderTopWidth: 1,
          borderTopColor: C.border,
          elevation: 0,
          ...(isWeb ? { height: 64 } : {}),
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: C.backgroundSecondary }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ホーム",
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "履歴",
          tabBarIcon: ({ color }) => <TabIcon name="list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "設定",
          tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.background }}>
        <ActivityIndicator size="large" color={C.tint} />
      </View>
    );
  }

  if (isGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
