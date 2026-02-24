import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
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
