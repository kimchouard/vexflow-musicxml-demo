/**
 * Minimal MusicXML parser → VexFlow-friendly intermediate representation.
 * Uses fast-xml-parser (works in both RN Hermes and web).
 */
import { XMLParser } from 'fast-xml-parser';

export interface ParsedNote {
  keys: string[];
  duration: string;
  isRest?: boolean;
}

export interface ParsedMeasure {
  notes: ParsedNote[];
  clef?: string;
  timeSignature?: string;
  keySignature?: string;
}

export interface ParsedScore {
  title?: string;
  measures: ParsedMeasure[];
}

const TYPE_TO_DURATION: Record<string, string> = {
  whole: 'w', half: 'h', quarter: 'q', eighth: '8', '16th': '16', '32nd': '32',
};

const FIFTHS_TO_KEY: Record<string, string> = {
  '-7': 'Cb', '-6': 'Gb', '-5': 'Db', '-4': 'Ab', '-3': 'Eb', '-2': 'Bb', '-1': 'F',
  '0': 'C', '1': 'G', '2': 'D', '3': 'A', '4': 'E', '5': 'B', '6': 'F#', '7': 'C#',
};

const CLEF_MAP: Record<string, string> = {
  G2: 'treble', F4: 'bass', C3: 'alto', C4: 'tenor',
};

function ensureArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}

export function parseMusicXML(xmlString: string): ParsedScore {
  const parser = new XMLParser({
    ignoreAttributes: true,
    isArray: (name) => ['measure', 'note', 'part'].includes(name),
  });
  const doc = parser.parse(xmlString);
  const parts = ensureArray(doc?.['score-partwise']?.part);
  if (parts.length === 0) return { measures: [] };

  const rawMeasures = ensureArray(parts[0].measure);
  const measures: ParsedMeasure[] = [];
  let lastTimeSignature = '4/4';
  let lastClef = 'treble';

  for (const m of rawMeasures) {
    const parsed: ParsedMeasure = { notes: [] };

    const attrs = m.attributes;
    if (attrs) {
      const clefData = attrs.clef;
      if (clefData) {
        const sign = String(clefData.sign || 'G');
        const line = String(clefData.line || '2');
        lastClef = CLEF_MAP[`${sign}${line}`] || 'treble';
        parsed.clef = lastClef;
      }
      const keyData = attrs.key;
      if (keyData) {
        const fifths = String(keyData.fifths ?? '0');
        parsed.keySignature = FIFTHS_TO_KEY[fifths] || 'C';
      }
      const timeData = attrs.time;
      if (timeData) {
        const beats = String(timeData.beats || '4');
        const beatType = String(timeData['beat-type'] || '4');
        lastTimeSignature = `${beats}/${beatType}`;
        parsed.timeSignature = lastTimeSignature;
      }
    }

    if (!parsed.clef) parsed.clef = lastClef;
    if (!parsed.timeSignature) parsed.timeSignature = lastTimeSignature;

    const notes = ensureArray(m.note);
    for (const n of notes) {
      if (n.chord !== undefined) continue;
      const isRest = n.rest !== undefined;
      const typeStr = String(n.type || 'quarter');
      const duration = TYPE_TO_DURATION[typeStr] || 'q';

      if (isRest) {
        parsed.notes.push({ keys: ['b/4'], duration: duration + 'r', isRest: true });
      } else if (n.pitch) {
        const step = String(n.pitch.step || 'C').toLowerCase();
        const octave = String(n.pitch.octave || '4');
        const alter = n.pitch.alter;
        let accidental = '';
        if (String(alter) === '1') accidental = '#';
        else if (String(alter) === '-1') accidental = 'b';
        parsed.notes.push({ keys: [`${step}${accidental}/${octave}`], duration });
      }
    }
    measures.push(parsed);
  }
  return { measures };
}
