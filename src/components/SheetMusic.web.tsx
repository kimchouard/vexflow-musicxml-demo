import React, { useRef, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { Renderer, Stave, StaveNote, Voice, Formatter } from 'vexflow';
import type { ParsedScore, ParsedMeasure } from '../parser/musicxml';

const STAVE_HEIGHT = 150;
const STAVE_Y = 40;
const MARGIN = 10;

interface SheetMusicProps {
  score: ParsedScore;
}

function measureIdealWidth(measure: ParsedMeasure, isFirstOfScore: boolean): number {
  const timeParts = (measure.timeSignature || '4/4').split('/');
  const numBeats = parseInt(timeParts[0], 10) || 4;
  const baseWidth = numBeats * 20;
  const extra = isFirstOfScore ? 40 : 0;
  return baseWidth + extra;
}

function layoutLines(
  measures: ParsedMeasure[],
  availableWidth: number
): { measures: ParsedMeasure[]; idealWidths: number[] }[] {
  if (measures.length === 0) return [];

  const usable = availableWidth - MARGIN * 2;
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

export default function SheetMusicWeb({ score }: SheetMusicProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || score.measures.length === 0) return;
    container.innerHTML = '';

    const width = container.clientWidth || 800;
    const lines = layoutLines(score.measures, width);
    const totalHeight = lines.length * STAVE_HEIGHT + 20;

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(width, totalHeight);
    const context = renderer.getContext();

    lines.forEach((line, lineIdx) => {
      const usableWidth = width - MARGIN * 2;
      const totalIdeal = line.idealWidths.reduce((a, b) => a + b, 0);
      const staveWidths = line.idealWidths.map((w) => (w / totalIdeal) * usableWidth);
      const yOffset = lineIdx * STAVE_HEIGHT;

      let x = MARGIN;
      line.measures.forEach((measure, idx) => {
        const staveWidth = staveWidths[idx];
        const stave = new Stave(x, yOffset + STAVE_Y, staveWidth);

        if (idx === 0 && lineIdx === 0) {
          if (measure.clef) stave.addClef(measure.clef);
          if (measure.keySignature && measure.keySignature !== 'C')
            stave.addKeySignature(measure.keySignature);
          if (measure.timeSignature) stave.addTimeSignature(measure.timeSignature);
        } else if (idx === 0 && measure.clef) {
          stave.addClef(measure.clef);
        }

        stave.setContext(context).draw();

        if (measure.notes.length > 0) {
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

            const noteStartX = stave.getNoteStartX();
            const noteEndX = stave.getNoteEndX();
            const formatWidth = Math.max(noteEndX - noteStartX - 10, 50);
            new Formatter().joinVoices([voice]).format([voice], formatWidth);
            voice.draw(context, stave);
          } catch (e) {
            console.warn(`Error rendering measure ${idx}:`, e);
          }
        }

        x += staveWidth;
      });
    });
  }, [score]);

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ minHeight: 200 }}>
        <div ref={containerRef} style={{ width: '100%', padding: 8 }} />
      </View>
    </ScrollView>
  );
}
