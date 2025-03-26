import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="start-shift" options={{ headerShown: false }} />
      <Stack.Screen name="route-overview" options={{ headerShown: false }} />
      <Stack.Screen name="qr-scan" options={{ headerShown: false }} />
      <Stack.Screen name="map-view" options={{ headerShown: false }} />
      <Stack.Screen name="order-detail" options={{ headerShown: false }} />
      <Stack.Screen name="proof-of-delivery" options={{ headerShown: false }} />
      <Stack.Screen name="take-photo" options={{ headerShown: false }} />
      <Stack.Screen name="end-shift" options={{ headerShown: false }} />
    </Stack>
  );
}