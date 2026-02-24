import React, { useState, useMemo, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import SheetMusic from './src/components/SheetMusic';
import { parseMusicXML } from './src/parser/musicxml';
import { twinkleXml, scaleXml, odeToJoyXml } from './src/data/samples';

interface SampleEntry {
  label: string;
  xml: string;
}

const BUILTIN_SAMPLES: SampleEntry[] = [
  { label: '⭐ Twinkle Twinkle', xml: twinkleXml },
  { label: '🎵 C Major Scale', xml: scaleXml },
  { label: '🎶 Ode to Joy', xml: odeToJoyXml },
];

export default function App() {
  const [samples, setSamples] = useState<SampleEntry[]>(BUILTIN_SAMPLES);
  const [selectedIdx, setSelectedIdx] = useState(1); // Default to C Major Scale
  const [error, setError] = useState<string | null>(null);

  const score = useMemo(() => {
    setError(null);
    try {
      return parseMusicXML(samples[selectedIdx].xml);
    } catch (e: any) {
      console.error('Parse error:', e);
      setError(e?.message || 'Failed to parse MusicXML');
      return { measures: [] };
    }
  }, [selectedIdx, samples]);

  const pickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === 'web'
          ? ['text/xml', 'application/xml', 'application/vnd.recordare.musicxml+xml', '.musicxml', '.xml']
          : ['public.xml', 'public.text'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      let xmlContent: string;

      if (Platform.OS === 'web') {
        // On web, read via fetch from the blob URI
        const response = await fetch(asset.uri);
        xmlContent = await response.text();
      } else {
        // On native, read from the cached file
        xmlContent = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      // Validate it's MusicXML
      if (!xmlContent.includes('score-partwise') && !xmlContent.includes('score-timewise')) {
        const msg = 'This doesn\'t look like a MusicXML file. Expected <score-partwise> or <score-timewise>.';
        if (Platform.OS === 'web') {
          alert(msg);
        } else {
          Alert.alert('Invalid File', msg);
        }
        return;
      }

      // Extract filename without extension for the label
      const name = asset.name?.replace(/\.(musicxml|xml)$/i, '') || 'Custom Score';

      const newEntry: SampleEntry = { label: `📄 ${name}`, xml: xmlContent };
      const newSamples = [...samples, newEntry];
      setSamples(newSamples);
      setSelectedIdx(newSamples.length - 1);
    } catch (e: any) {
      console.error('File pick error:', e);
      const msg = e?.message || 'Failed to open file';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    }
  }, [samples]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.title}>🎼 VexFlow MusicXML Demo</Text>
      <Text style={styles.subtitle}>
        Powered by vexflow{Platform.OS !== 'web' ? '-native + Skia' : ' SVG'}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.picker}
      >
        {samples.map((s, idx) => (
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
        <TouchableOpacity style={styles.uploadTab} onPress={pickFile}>
          <Text style={styles.uploadTabText}>＋ Open File</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.sheetContainer}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <SheetMusic score={score} />
        )}
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
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  uploadTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
  },
  uploadTabText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
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
