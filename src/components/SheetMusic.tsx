import React from 'react';
import { Platform } from 'react-native';
import type { ParsedScore } from '../parser/musicxml';

interface SheetMusicProps {
  score: ParsedScore;
  measuresPerLine?: number;
}

let SheetMusic: React.ComponentType<SheetMusicProps>;

if (Platform.OS === 'web') {
  SheetMusic = require('./SheetMusic.web').default;
} else {
  SheetMusic = require('./SheetMusic.native').default;
}

export default SheetMusic;
