import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="become-vip" />
        <Stack.Screen name="buy-coins" />
        <Stack.Screen name="configure-ads" />
        <Stack.Screen name="contact-support" />
        <Stack.Screen name="delete-account" />
        <Stack.Screen name="edit-video" />
        <Stack.Screen name="languages" />
        <Stack.Screen name="privacy-policy" />
        <Stack.Screen name="rate-us" />
        <Stack.Screen name="refer-friend" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </AuthProvider>
  );
}