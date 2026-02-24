import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { scoreStore } from '../src/store/scoreStore';

const DEMOS = [
  { id: 'twinkle', label: '⭐ Twinkle Twinkle Little Star', subtitle: '12 measures · Quarter & half notes' },
  { id: 'c-major-scale', label: '🎵 C Major Scale', subtitle: '6 measures · Up and down' },
  { id: 'ode-to-joy', label: '🎶 Ode to Joy', subtitle: '8 measures · Beethoven' },
];

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width > 600;

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
        const response = await fetch(asset.uri);
        xmlContent = await response.text();
      } else {
        xmlContent = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      if (!xmlContent.includes('score-partwise') && !xmlContent.includes('score-timewise')) {
        const msg = 'This doesn\'t look like a MusicXML file.';
        Platform.OS === 'web' ? alert(msg) : Alert.alert('Invalid File', msg);
        return;
      }

      const name = asset.name?.replace(/\.(musicxml|xml)$/i, '') || 'Custom Score';
      scoreStore.setCustomScore(name, xmlContent);
      router.push('/viewer');
    } catch (e: any) {
      console.error('File pick error:', e);
      const msg = e?.message || 'Failed to open file';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        Powered by vexflow{Platform.OS !== 'web' ? '-native + Skia' : ' SVG'}
      </Text>

      <View style={[styles.buttonRow, isWide && styles.buttonRowWide]}>
        {/* Demo selector */}
        <View style={[styles.section, isWide && styles.sectionHalf]}>
          <Text style={styles.sectionTitle}>Sample Scores</Text>
          {DEMOS.map((demo) => (
            <TouchableOpacity
              key={demo.id}
              style={styles.demoButton}
              onPress={() => router.push(`/demo/${demo.id}`)}
            >
              <Text style={styles.demoLabel}>{demo.label}</Text>
              <Text style={styles.demoSubtitle}>{demo.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upload button */}
        <View style={[styles.section, isWide && styles.sectionHalf]}>
          <Text style={styles.sectionTitle}>Your Music</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={pickFile}>
            <Text style={styles.uploadIcon}>📄</Text>
            <Text style={styles.uploadLabel}>Open MusicXML File</Text>
            <Text style={styles.uploadSubtitle}>
              .musicxml or .xml files
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#888',
    marginBottom: 24,
  },
  buttonRow: {
    flex: 1,
    gap: 16,
  },
  buttonRowWide: {
    flexDirection: 'row',
  },
  section: {
    gap: 8,
  },
  sectionHalf: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  demoButton: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  demoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  demoSubtitle: {
    fontSize: 13,
    color: '#888',
  },
  uploadButton: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 8,
  },
  uploadIcon: {
    fontSize: 32,
  },
  uploadLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  uploadSubtitle: {
    fontSize: 13,
    color: '#888',
  },
});
