/**
 * Web-compatible VexflowCanvas that keeps Skia objects alive
 * to prevent CanvasKit WASM GC issues during Picture playback.
 *
 * The core fix: we store all SkPaint, SkPath, SkFont objects created
 * during recording in an array, preventing JS garbage collection
 * from freeing the underlying WASM pointers before playback.
 */
import React, { useMemo } from 'react';
import { Text, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Picture,
  Skia,
  useFont,
  type SkFont,
  type SkPicture,
} from '@shopify/react-native-skia';
import { Element } from 'vexflow';
import SkiaVexflowContext from 'vexflow-native/lib/module/SkiaVexflowContext';
import { createFont, getAdvanceWidth, parseCssFontShorthand } from 'vexflow-native/lib/module/utils';
import { VEXFLOW_SCORE_COLORS } from 'vexflow-native/lib/module/constants';

export type VexflowCanvasDrawArgs = {
  ctx: SkiaVexflowContext;
  width: number;
  height: number;
};

type Props = {
  onDraw: (args: VexflowCanvasDrawArgs) => void;
  font: Parameters<typeof useFont>[0];
  width?: number;
  height?: number;
  colorScheme?: 'light' | 'dark';
};

const fontName = 'vexflowFont';

function createTextMeasurementCanvas(skiaFont: SkFont) {
  let currentFont = createFont(12, fontName, skiaFont);

  const measureContext = {
    measureText: (text: string) => {
      const width = getAdvanceWidth(currentFont, text);
      // font.measureText() is not implemented on React Native Web.
      // Use getMetrics() for ascent/descent and getAdvanceWidth for width.
      let ascent = 12, descent = 4;
      try {
        const metrics = currentFont.getMetrics();
        ascent = Math.abs(metrics.ascent ?? 12);
        descent = Math.abs(metrics.descent ?? 4);
      } catch {}
      return {
        width,
        actualBoundingBoxAscent: ascent,
        actualBoundingBoxDescent: descent,
        fontBoundingBoxAscent: ascent,
        fontBoundingBoxDescent: descent,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: width,
      };
    },
  };

  Object.defineProperty(measureContext, 'font', {
    get() { return ''; },
    set(value: string) {
      try {
        const parsed = parseCssFontShorthand(value);
        currentFont = createFont(parsed.sizePx, parsed.family, skiaFont);
      } catch {
        currentFont = createFont(12, fontName, skiaFont);
      }
    },
  });

  return {
    getContext: (type: string) => type === '2d' ? (measureContext as any) : null,
  };
}

/**
 * Monkey-patch Skia factories to intercept object creation and keep refs alive.
 * This prevents CanvasKit WASM's Emscripten pointers from being freed by JS GC
 * before the Picture plays back the recorded drawing commands.
 */
function createVexflowPictureWithRetainedRefs(
  width: number,
  height: number,
  onDraw: (args: VexflowCanvasDrawArgs) => void,
  skiaFont: SkFont,
  scoreColors: { fill: string; stroke: string }
): { picture: SkPicture; retainedRefs: any[] } {
  // Collect all Skia objects created during recording
  const retainedRefs: any[] = [skiaFont];

  // Intercept Skia object creation to retain references
  const origPathMake = Skia.Path.Make.bind(Skia.Path);
  const origPaint = (Skia as any).__origPaint || (() => Skia.Paint());

  // Store original Paint if not already stored
  if (!(Skia as any).__origPaint) {
    (Skia as any).__origPaint = Skia.Paint;
  }

  const patchedPaint = () => {
    const paint = (Skia as any).__origPaint();
    retainedRefs.push(paint);
    return paint;
  };

  const patchedPathMake = () => {
    const path = origPathMake();
    retainedRefs.push(path);
    return path;
  };

  // Apply patches
  (Skia as any).Paint = patchedPaint;
  Skia.Path.Make = patchedPathMake;

  try {
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, width, height));

    const ctx = new SkiaVexflowContext(canvas, skiaFont, {
      defaultFillStyle: scoreColors.fill,
      defaultStrokeStyle: scoreColors.stroke,
    });

    onDraw({ ctx, width, height });

    const picture = recorder.finishRecordingAsPicture();
    retainedRefs.push(recorder, picture);

    return { picture, retainedRefs };
  } finally {
    // Restore original factories
    (Skia as any).Paint = (Skia as any).__origPaint;
    Skia.Path.Make = origPathMake;
  }
}

export default function VexflowCanvasWeb({
  onDraw,
  font: fontSource,
  width,
  height = 180,
  colorScheme = 'light',
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const canvasWidth = width ?? Math.max(300, Math.floor(windowWidth) - 32);
  const skiaFont = useFont(fontSource, 30);

  const scoreColors = colorScheme === 'dark'
    ? VEXFLOW_SCORE_COLORS.dark
    : VEXFLOW_SCORE_COLORS.light;

  const pictureInfo = useMemo(() => {
    if (!skiaFont) return null;

    Element.setTextMeasurementCanvas(
      createTextMeasurementCanvas(skiaFont) as unknown as HTMLCanvasElement
    );

    try {
      const { picture, retainedRefs } = createVexflowPictureWithRetainedRefs(
        canvasWidth,
        height,
        onDraw,
        skiaFont,
        scoreColors
      );
      return { picture, width: canvasWidth, height, retainedRefs };
    } catch (e) {
      console.error('[VexflowCanvasWeb] Picture creation error:', e);
      return null;
    }
  }, [skiaFont, canvasWidth, height, onDraw, scoreColors]);

  if (!pictureInfo) {
    return <Text>{skiaFont ? 'Render error' : 'Loading font...'}</Text>;
  }

  return (
    <Canvas style={{ width: pictureInfo.width, height: pictureInfo.height }}>
      <Picture picture={pictureInfo.picture} />
    </Canvas>
  );
}
