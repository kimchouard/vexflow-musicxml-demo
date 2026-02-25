import React, { useMemo } from 'react';
import { Text, View, Platform } from 'react-native';
import { Canvas, Picture, Skia, useFont } from '@shopify/react-native-skia';
import { Element } from 'vexflow';
import SkiaVexflowContext from 'vexflow-native/lib/module/SkiaVexflowContext';
import { createFont, getAdvanceWidth, parseCssFontShorthand } from 'vexflow-native/lib/module/utils';
import { VEXFLOW_SCORE_COLORS } from 'vexflow-native/lib/module/constants';

function createTextMeasurementCanvas(skiaFont: any) {
  let currentFont = createFont(12, 'vexflowFont', skiaFont);
  const measureContext = {
    measureText: (text: string) => {
      const rect = currentFont.measureText(text);
      const width = getAdvanceWidth(currentFont, text);
      return {
        width,
        actualBoundingBoxAscent: Math.max(0, -rect.y),
        actualBoundingBoxDescent: Math.max(0, rect.y + rect.height),
        fontBoundingBoxAscent: Math.max(0, -rect.y),
        fontBoundingBoxDescent: Math.max(0, rect.y + rect.height),
        actualBoundingBoxLeft: rect.x,
        actualBoundingBoxRight: rect.x + rect.width,
      };
    },
  };
  Object.defineProperty(measureContext, 'font', {
    get() { return ''; },
    set(value: string) {
      try {
        const parsed = parseCssFontShorthand(value);
        currentFont = createFont(parsed.sizePx, parsed.family, skiaFont);
      } catch { currentFont = createFont(12, 'vexflowFont', skiaFont); }
    },
  });
  return { getContext: (t: string) => t === '2d' ? (measureContext as any) : null };
}

export default function SkiaTest() {
  const fontSource = require('../../assets/fonts/Bravura.otf');
  const skiaFont = useFont(fontSource, 30);

  const pictureInfo = useMemo(() => {
    if (!skiaFont) return null;

    console.log('[SkiaTest] Setting up text measurement...');
    Element.setTextMeasurementCanvas(
      createTextMeasurementCanvas(skiaFont) as unknown as HTMLCanvasElement
    );
    console.log('[SkiaTest] Text measurement set up');

    try {
      const recorder = Skia.PictureRecorder();
      const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, 350, 150));
      console.log('[SkiaTest] Creating SkiaVexflowContext...');
      
      const scoreColors = VEXFLOW_SCORE_COLORS.light;
      const ctx = new SkiaVexflowContext(canvas, skiaFont, {
        defaultFillStyle: scoreColors.fill,
        defaultStrokeStyle: scoreColors.stroke,
      });
      console.log('[SkiaTest] Context created!');

      const picture = recorder.finishRecordingAsPicture();
      return { picture, width: 350, height: 150 };
    } catch (e: any) {
      console.error('[SkiaTest] Error:', e?.message || e);
      return null;
    }
  }, [skiaFont]);

  if (!skiaFont) return <Text>Loading font...</Text>;
  if (!pictureInfo) return <Text>Error - check console</Text>;

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Platform: {Platform.OS} - Context created OK!</Text>
      <Canvas style={{ width: pictureInfo.width, height: pictureInfo.height }}>
        <Picture picture={pictureInfo.picture} />
      </Canvas>
    </View>
  );
}
