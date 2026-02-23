/**
 * Minimal MusicXML parser → VexFlow-friendly intermediate representation.
 */

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

function getTextContent(el: Element, tag: string): string | null {
  const child = el.getElementsByTagName(tag)[0];
  return child ? child.textContent?.trim() ?? null : null;
}

export function parseMusicXML(xmlString: string): ParsedScore {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');
  const measures: ParsedMeasure[] = [];
  const measureEls = doc.getElementsByTagName('measure');

  let lastTimeSignature = '4/4';
  let lastClef = 'treble';

  for (let i = 0; i < measureEls.length; i++) {
    const measureEl = measureEls[i];
    const parsed: ParsedMeasure = { notes: [] };

    const attrs = measureEl.getElementsByTagName('attributes')[0];
    if (attrs) {
      const clefEl = attrs.getElementsByTagName('clef')[0];
      if (clefEl) {
        const sign = getTextContent(clefEl, 'sign') || 'G';
        const line = getTextContent(clefEl, 'line') || '2';
        lastClef = CLEF_MAP[`${sign}${line}`] || 'treble';
        parsed.clef = lastClef;
      }
      const keyEl = attrs.getElementsByTagName('key')[0];
      if (keyEl) {
        const fifths = getTextContent(keyEl, 'fifths') || '0';
        parsed.keySignature = FIFTHS_TO_KEY[fifths] || 'C';
      }
      const timeEl = attrs.getElementsByTagName('time')[0];
      if (timeEl) {
        const beats = getTextContent(timeEl, 'beats') || '4';
        const beatType = getTextContent(timeEl, 'beat-type') || '4';
        lastTimeSignature = `${beats}/${beatType}`;
        parsed.timeSignature = lastTimeSignature;
      }
    }

    if (!parsed.clef) parsed.clef = lastClef;
    if (!parsed.timeSignature) parsed.timeSignature = lastTimeSignature;

    const noteEls = measureEl.getElementsByTagName('note');
    for (let j = 0; j < noteEls.length; j++) {
      const noteEl = noteEls[j];
      if (noteEl.getElementsByTagName('chord').length > 0) continue;
      const isRest = noteEl.getElementsByTagName('rest').length > 0;
      const typeStr = getTextContent(noteEl, 'type') || 'quarter';
      const duration = TYPE_TO_DURATION[typeStr] || 'q';

      if (isRest) {
        parsed.notes.push({ keys: ['b/4'], duration: duration + 'r', isRest: true });
      } else {
        const pitchEl = noteEl.getElementsByTagName('pitch')[0];
        if (pitchEl) {
          const step = (getTextContent(pitchEl, 'step') || 'C').toLowerCase();
          const octave = getTextContent(pitchEl, 'octave') || '4';
          const alter = getTextContent(pitchEl, 'alter');
          let accidental = '';
          if (alter === '1') accidental = '#';
          else if (alter === '-1') accidental = 'b';
          parsed.notes.push({ keys: [`${step}${accidental}/${octave}`], duration });
        }
      }
    }
    measures.push(parsed);
  }
  return { measures };
}
