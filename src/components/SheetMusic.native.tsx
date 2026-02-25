import React, { useCallback } from 'react';
import { ScrollView, View, Platform, useWindowDimensions } from 'react-native';
import { Formatter, Stave, StaveNote, Voice } from 'vexflow';
import { VexflowCanvas as VexflowCanvasNative, type VexflowCanvasDrawArgs } from 'vexflow-native';
import type { ParsedScore, ParsedMeasure } from '../parser/musicxml';

// On web, use our custom canvas that retains Skia object references
// to prevent CanvasKit WASM GC issues during Picture playback
const VexflowCanvas = Platform.OS === 'web'
  ? require('./VexflowCanvasWeb').default
  : VexflowCanvasNative;

const STAVE_HEIGHT = 150;
const STAVE_Y_OFFSET = 40;
const STAVE_MARGIN = 10;

interface SheetMusicProps {
  score: ParsedScore;
}

/**
 * Compute ideal width for each measure based on its rhythmic content.
 * More beats / more notes = wider measure. First measure of score gets extra for clef+key+time.
 */
function measureIdealWidth(measure: ParsedMeasure, isFirstOfScore: boolean): number {
  // Target ~2 measures per line on mobile (~375pt usable ~355pt)
  // 4 beats × 38px = 152px base; first measure gets +40 for clef/time
  // 152+40 + 152 = 344 → fits 2 measures on first line
  const timeParts = (measure.timeSignature || '4/4').split('/');
  const numBeats = parseInt(timeParts[0], 10) || 4;
  const baseWidth = numBeats * 38;
  const extra = isFirstOfScore ? 40 : 0;
  return baseWidth + extra;
}

/**
 * Greedily pack measures into lines that fit within availableWidth.
 * Returns array of lines, each line is { measures, idealWidths }.
 */
function layoutLines(
  measures: ParsedMeasure[],
  availableWidth: number
): { measures: ParsedMeasure[]; idealWidths: number[] }[] {
  if (measures.length === 0) return [];

  const usable = availableWidth - STAVE_MARGIN * 2;
  const lines: { measures: ParsedMeasure[]; idealWidths: number[] }[] = [];
  let curMeasures: ParsedMeasure[] = [];
  let curWidths: number[] = [];
  let curTotal = 0;

  for (let i = 0; i < measures.length; i++) {
    const ideal = measureIdealWidth(measures[i], i === 0);

    if (curMeasures.length > 0 && curTotal + ideal > usable) {
      lines.push({ measures: curMeasures, idealWidths: curWidths });
      curMeasures = [];
      curWidths = [];
      curTotal = 0;
    }

    curMeasures.push(measures[i]);
    curWidths.push(ideal);
    curTotal += ideal;
  }

  if (curMeasures.length > 0) {
    lines.push({ measures: curMeasures, idealWidths: curWidths });
  }

  return lines;
}

export default function SheetMusicNative({ score }: SheetMusicProps) {
  const { width: screenWidth } = useWindowDimensions();
  const containerWidth = screenWidth - 16;
  const lines = layoutLines(score.measures, containerWidth);

  return (
    <ScrollView style={{ flex: 1 }}>
      {lines.map((line, lineIdx) => (
        <SheetMusicLine
          key={`${lineIdx}-${line.measures.length}`}
          measures={line.measures}
          idealWidths={line.idealWidths}
          isFirstLine={lineIdx === 0}
          availableWidth={containerWidth}
        />
      ))}
    </ScrollView>
  );
}

function SheetMusicLine({
  measures,
  idealWidths,
  isFirstLine,
  availableWidth,
}: {
  measures: ParsedMeasure[];
  idealWidths: number[];
  isFirstLine: boolean;
  availableWidth: number;
}) {
  const font = require('../../assets/fonts/Bravura.otf');

  const onDraw = useCallback(
    ({ ctx }: VexflowCanvasDrawArgs) => {
      try {
      const numMeasures = measures.length;
      if (numMeasures === 0) return;

      // Distribute width proportionally: each measure gets its share of usable width
      // proportional to its ideal width
      const usableWidth = availableWidth - STAVE_MARGIN * 2;
      const totalIdeal = idealWidths.reduce((a, b) => a + b, 0);
      const staveWidths = idealWidths.map((w) => (w / totalIdeal) * usableWidth);

      let x = STAVE_MARGIN;
      measures.forEach((measure, idx) => {
        const staveWidth = staveWidths[idx];
        const stave = new Stave(x, STAVE_Y_OFFSET, staveWidth);

        if (idx === 0 && isFirstLine) {
          if (measure.clef) stave.addClef(measure.clef);
          if (measure.keySignature && measure.keySignature !== 'C') {
            stave.addKeySignature(measure.keySignature);
          }
          if (measure.timeSignature) stave.addTimeSignature(measure.timeSignature);
        } else if (idx === 0 && measure.clef) {
          stave.addClef(measure.clef);
        }

        stave.setContext(ctx).draw();

        if (measure.notes.length === 0) {
          x += staveWidth;
          return;
        }

        try {
          const staveNotes = measure.notes.map(
            (n) =>
              new StaveNote({
                clef: measure.clef || 'treble',
                keys: n.keys,
                duration: n.duration,
              })
          );

          const timeParts = (measure.timeSignature || '4/4').split('/');
          const numBeats = parseInt(timeParts[0], 10) || 4;
          const beatValue = parseInt(timeParts[1], 10) || 4;

          const voice = new Voice({ numBeats, beatValue });
          voice.setStrict(false);
          voice.addTickables(staveNotes);

          // Use stave's actual note start position to compute available space
          // getNoteStartX() returns where notes begin (after clef/key/time)
          // getNoteEndX() returns where notes should end (before end barline)
          const noteStartX = stave.getNoteStartX();
          const noteEndX = stave.getNoteEndX();
          const formatWidth = Math.max(noteEndX - noteStartX - 10, 50);
          new Formatter().joinVoices([voice]).format([voice], formatWidth);
          voice.draw(ctx, stave);
        } catch (e) {
          console.warn(`Error rendering measure ${idx}:`, e);
        }

        x += staveWidth;
      });
      } catch (e) {
        console.error('[SheetMusic] onDraw crashed:', e);
      }
    },
    [measures, idealWidths, isFirstLine, availableWidth]
  );

  return (
    <View style={{ marginVertical: 4 }}>
      <VexflowCanvas
        onDraw={onDraw}
        font={font}
        height={STAVE_HEIGHT}
        width={availableWidth}
        colorScheme="light"
      />
    </View>
  );
}
