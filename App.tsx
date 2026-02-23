import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import SheetMusic from './src/components/SheetMusic';
import { parseMusicXML } from './src/parser/musicxml';
import { twinkleXml, scaleXml, odeToJoyXml } from './src/data/samples';

const SAMPLES = [
  { label: '⭐ Twinkle Twinkle', xml: twinkleXml },
  { label: '🎵 C Major Scale', xml: scaleXml },
  { label: '🎶 Ode to Joy', xml: odeToJoyXml },
];

export default function App() {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const score = useMemo(() => {
    try {
      return parseMusicXML(SAMPLES[selectedIdx].xml);
    } catch (e) {
      console.error('Parse error:', e);
      return { measures: [] };
    }
  }, [selectedIdx]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.title}>🎼 VexFlow MusicXML Demo</Text>
      <Text style={styles.subtitle}>Powered by vexflow{Platform.OS !== 'web' ? '-native + Skia' : ' SVG'}</Text>

      <View style={styles.picker}>
        {SAMPLES.map((s, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.tab, selectedIdx === idx && styles.tabActive]}
            onPress={() => setSelectedIdx(idx)}
          >
            <Text style={[styles.tabText, selectedIdx === idx && styles.tabTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sheetContainer}>
        <SheetMusic score={score} measuresPerLine={4} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#888',
    marginBottom: 16,
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E8E8E8',
  },
  tabActive: {
    backgroundColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFF',
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
