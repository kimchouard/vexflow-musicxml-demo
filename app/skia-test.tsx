import React from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 16, color: 'red', textAlign: 'center' }}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

import SkiaTest from '../src/components/SkiaTest';

export default function SkiaTestScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Skia Test' }} />
      <ErrorBoundary>
        <SkiaTest />
      </ErrorBoundary>
    </>
  );
}
