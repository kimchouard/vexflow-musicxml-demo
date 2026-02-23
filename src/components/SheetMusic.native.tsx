import React, { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { Formatter, Stave, StaveNote, Voice } from 'vexflow';
import { VexflowCanvas, type VexflowCanvasDrawArgs } from 'vexflow-native';
import type { ParsedScore, ParsedMeasure } from '../parser/musicxml';

const STAVE_HEIGHT = 150;
const STAVE_Y_OFFSET = 40;
const STAVE_MARGIN = 10;

interface SheetMusicProps {
  score: ParsedScore;
  measuresPerLine?: number;
}

export default function SheetMusicNative({ score, measuresPerLine = 4 }: SheetMusicProps) {
  const lines: ParsedMeasure[][] = [];
  for (let i = 0; i < score.measures.length; i += measuresPerLine) {
    lines.push(score.measures.slice(i, i + measuresPerLine));
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      {lines.map((lineMeasures, lineIdx) => (
        <SheetMusicLine key={lineIdx} measures={lineMeasures} isFirstLine={lineIdx === 0} />
      ))}
    </ScrollView>
  );
}

function SheetMusicLine({
  measures,
  isFirstLine,
}: {
  measures: ParsedMeasure[];
  isFirstLine: boolean;
}) {
  const font = require('../../assets/fonts/Bravura.otf');

  const onDraw = useCallback(
    ({ ctx, width }: VexflowCanvasDrawArgs) => {
      const numMeasures = measures.length;
      if (numMeasures === 0) return;

      const staveWidth = (width - STAVE_MARGIN * 2) / numMeasures;

      measures.forEach((measure, idx) => {
        const x = STAVE_MARGIN + idx * staveWidth;
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

        if (measure.notes.length === 0) return;

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

          new Formatter().joinVoices([voice]).format([voice], staveWidth - 60);
          voice.draw(ctx, stave);
        } catch (e) {
          console.warn(`Error rendering measure ${idx}:`, e);
        }
      });
    },
    [measures, isFirstLine]
  );

  return (
    <View style={{ marginVertical: 4 }}>
      <VexflowCanvas onDraw={onDraw} font={font} height={STAVE_HEIGHT} colorScheme="light" />
    </View>
  );
}
