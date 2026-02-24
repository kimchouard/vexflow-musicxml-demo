import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import SheetMusic from '../src/components/SheetMusic';
import { parseMusicXML } from '../src/parser/musicxml';
import { scoreStore } from '../src/store/scoreStore';

export default function ViewerScreen() {
  const { name, xml } = scoreStore.getCustomScore();

  const score = useMemo(() => {
    if (!xml) return null;
    try {
      return parseMusicXML(xml);
    } catch (e: any) {
      console.error('Parse error:', e);
      return null;
    }
  }, [xml]);

  if (!xml || !score) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>
          {!xml ? 'No file loaded. Go back and open a MusicXML file.' : 'Failed to parse MusicXML file.'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `📄 ${name}` }} />
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
    color: '#D32F2F',
    textAlign: 'center',
    lineHeight: 24,
  },
});
