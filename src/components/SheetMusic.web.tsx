import React, { useRef, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { Renderer, Stave, StaveNote, Voice, Formatter } from 'vexflow';
import type { ParsedScore, ParsedMeasure } from '../parser/musicxml';

const STAVE_HEIGHT = 150;
const STAVE_Y = 40;
const MARGIN = 10;

interface SheetMusicProps {
  score: ParsedScore;
  measuresPerLine?: number;
}

export default function SheetMusicWeb({ score, measuresPerLine = 4 }: SheetMusicProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || score.measures.length === 0) return;
    container.innerHTML = '';
    const width = container.clientWidth || 800;
    const lines: ParsedMeasure[][] = [];
    for (let i = 0; i < score.measures.length; i += measuresPerLine) {
      lines.push(score.measures.slice(i, i + measuresPerLine));
    }
    const totalHeight = lines.length * STAVE_HEIGHT + 20;
    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(width, totalHeight);
    const context = renderer.getContext();

    lines.forEach((lineMeasures, lineIdx) => {
      const staveWidth = (width - MARGIN * 2) / lineMeasures.length;
      const yOffset = lineIdx * STAVE_HEIGHT;
      lineMeasures.forEach((measure, idx) => {
        const x = MARGIN + idx * staveWidth;
        const stave = new Stave(x, yOffset + STAVE_Y, staveWidth);
        if (idx === 0 && lineIdx === 0) {
          if (measure.clef) stave.addClef(measure.clef);
          if (measure.keySignature && measure.keySignature !== 'C') stave.addKeySignature(measure.keySignature);
          if (measure.timeSignature) stave.addTimeSignature(measure.timeSignature);
        } else if (idx === 0 && measure.clef) {
          stave.addClef(measure.clef);
        }
        stave.setContext(context).draw();
        if (measure.notes.length === 0) return;
        try {
          const staveNotes = measure.notes.map((n) => new StaveNote({ clef: measure.clef || 'treble', keys: n.keys, duration: n.duration }));
          const timeParts = (measure.timeSignature || '4/4').split('/');
          const numBeats = parseInt(timeParts[0], 10) || 4;
          const beatValue = parseInt(timeParts[1], 10) || 4;
          const voice = new Voice({ numBeats, beatValue });
          voice.setStrict(false);
          voice.addTickables(staveNotes);
          new Formatter().joinVoices([voice]).format([voice], staveWidth - 60);
          voice.draw(context, stave);
        } catch (e) {
          console.warn(`Error rendering measure ${idx}:`, e);
        }
      });
    });
  }, [score, measuresPerLine]);

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ minHeight: 200 }}>
        <div ref={containerRef} style={{ width: '100%', padding: 8 }} />
      </View>
    </ScrollView>
  );
}
