import React from 'react';
import { Platform, Text, View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

function AppLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FAFAFA' },
          headerTintColor: '#1a1a1a',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#FAFAFA' },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: '🎼 VexFlow MusicXML Demo' }}
        />
        <Stack.Screen
          name="demo/[demoId]"
          options={{ title: 'Sheet Music' }}
        />
        <Stack.Screen
          name="viewer"
          options={{ title: 'Custom Score' }}
        />
      </Stack>
    </>
  );
}

function LoadingFallback() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
      <ActivityIndicator size="large" color="#2196F3" />
      <Text style={{ marginTop: 16, color: '#888', fontSize: 14 }}>Loading Skia...</Text>
    </View>
  );
}

export default function RootLayout() {
  if (Platform.OS === 'web') {
    // Dynamically import WithSkiaWeb to avoid bundling on native
    const { WithSkiaWeb } = require('@shopify/react-native-skia/lib/module/web');
    return (
      <WithSkiaWeb
        getComponent={() => ({ default: AppLayout })}
        fallback={<LoadingFallback />}
        opts={{ locateFile: (file: string) => `/${file}` }}
      />
    );
  }

  return <AppLayout />;
}
