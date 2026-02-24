import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import SheetMusic from '../../src/components/SheetMusic';
import { parseMusicXML } from '../../src/parser/musicxml';
import { twinkleXml, scaleXml, odeToJoyXml } from '../../src/data/samples';

const DEMO_MAP: Record<string, { title: string; xml: string }> = {
  'twinkle': { title: '⭐ Twinkle Twinkle', xml: twinkleXml },
  'c-major-scale': { title: '🎵 C Major Scale', xml: scaleXml },
  'ode-to-joy': { title: '🎶 Ode to Joy', xml: odeToJoyXml },
};

export default function DemoScreen() {
  const { demoId } = useLocalSearchParams<{ demoId: string }>();
  const demo = DEMO_MAP[demoId || ''];

  const score = useMemo(() => {
    if (!demo) return null;
    try {
      return parseMusicXML(demo.xml);
    } catch (e) {
      console.error('Parse error:', e);
      return null;
    }
  }, [demo]);

  if (!demo || !score) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>🤷</Text>
        <Text style={styles.errorText}>
          Demo "{demoId}" not found
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: demo.title }} />
      <View style={styles.container}>
        <SheetMusic score={score} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
