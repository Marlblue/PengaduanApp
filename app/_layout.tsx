import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { OfflineBanner } from "../components/OfflineBanner";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

export default function RootLayout() {
  const { isOffline } = useNetworkStatus();

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <OfflineBanner visible={isOffline} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="pengaduan/create" />
        <Stack.Screen name="pengaduan/[id]" />
        <Stack.Screen name="pengaduan/update/[id]" />
        <Stack.Screen name="aspirasi/create" />
        <Stack.Screen name="aspirasi/[id]" />
        <Stack.Screen name="aspirasi/update/[id]" />
        <Stack.Screen name="admin/dashboard" />
        <Stack.Screen name="admin/users" />
      </Stack>
    </SafeAreaProvider>
  );
}
