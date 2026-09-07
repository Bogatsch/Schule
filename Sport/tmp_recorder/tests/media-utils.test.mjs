import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CAMERA_TARGET_FRAME_RATE,
  DELAY_DEFAULT_SECONDS,
  DELAY_MAX_SECONDS,
  DELAY_MIN_SECONDS,
  DELAY_MAX_BUFFERED_FRAMES,
  DELAY_MIN_FPS,
  DELAY_TARGET_FPS,
  MAX_RECORDING_MS,
  MAX_VIDEO_BITRATE,
  MIN_VIDEO_BITRATE,
  PLAYBACK_STEP_SECONDS,
  VIDEO_MIME_CANDIDATES,
  clampDelaySeconds,
  delayCaptureFps,
  delayCaptureIntervalMs,
  delaySecondsToKnobAngle,
  formatDelayCountdown,
  formatPlaybackTime,
  formatRecordingTime,
  knobAngleToDelaySeconds,
  nextStepTime,
  selectSupportedVideoMimeType,
  videoBitrateForFrameRate
} from '../media-utils.js';

test('bevorzugt WebM, wenn der Browser es unterstützt', () => {
  const checked = [];
  const recorder = {
    isTypeSupported(type) {
      checked.push(type);
      return type === 'video/webm;codecs=vp8';
    }
  };

  assert.equal(selectSupportedVideoMimeType(recorder), 'video/webm;codecs=vp8');
  assert.deepEqual(checked, VIDEO_MIME_CANDIDATES.slice(0, 2));
});

test('fällt auf MP4 zurück, wenn WebM nicht verfügbar ist', () => {
  const recorder = {
    isTypeSupported: (type) => type === 'video/mp4'
  };

  assert.equal(selectSupportedVideoMimeType(recorder), 'video/mp4');
});

test('meldet ein nicht unterstütztes Aufnahmeformat', () => {
  assert.equal(selectSupportedVideoMimeType({ isTypeSupported: () => false }), null);
  assert.equal(selectSupportedVideoMimeType(null), null);
  assert.equal(selectSupportedVideoMimeType({}), null);
});

test('überspringt Browserfehler bei der Formatprüfung', () => {
  const recorder = {
    isTypeSupported(type) {
      if (type.startsWith('video/webm')) {
        throw new Error('nicht verfügbar');
      }
      return type === 'video/mp4';
    }
  };

  assert.equal(selectSupportedVideoMimeType(recorder), 'video/mp4');
});

test('enthält WebM- und MP4-Aufnahmeformate', () => {
  assert.ok(VIDEO_MIME_CANDIDATES.length > 0);
  assert.ok(VIDEO_MIME_CANDIDATES.some((type) => type.startsWith('video/webm')));
  assert.ok(VIDEO_MIME_CANDIDATES.some((type) => type.startsWith('video/mp4')));
});

test('formatiert und begrenzt den Aufnahmezähler auf 3 Minuten', () => {
  assert.equal(MAX_RECORDING_MS, 180_000);
  assert.equal(formatRecordingTime(0), '00:00.0');
  assert.equal(formatRecordingTime(12_349), '00:12.3');
  assert.equal(formatRecordingTime(99_999), '01:39.9');
  assert.equal(formatRecordingTime(999_999), '03:00.0');
});

test('formatiert Wiedergabezeiten verständlich', () => {
  assert.equal(formatPlaybackTime(0), '0:00');
  assert.equal(formatPlaybackTime(9.9), '0:09');
  assert.equal(formatPlaybackTime(65), '1:05');
  assert.equal(formatPlaybackTime(Number.NaN), '0:00');
});

test('begrenzt die Verzögerung auf 1 bis 60 Sekunden', () => {
  assert.equal(DELAY_MIN_SECONDS, 1);
  assert.equal(DELAY_MAX_SECONDS, 60);
  assert.equal(clampDelaySeconds(0), DELAY_MIN_SECONDS);
  assert.equal(clampDelaySeconds(-12), DELAY_MIN_SECONDS);
  assert.equal(clampDelaySeconds(15), 15);
  assert.equal(clampDelaySeconds(15.4), 15);
  assert.equal(clampDelaySeconds(61), DELAY_MAX_SECONDS);
  assert.equal(clampDelaySeconds(Number.NaN), DELAY_DEFAULT_SECONDS);
  assert.equal(clampDelaySeconds('nicht numerisch'), DELAY_DEFAULT_SECONDS);
});

test('bildet den Drehregler auf einen 270-Grad-Bogen ab', () => {
  assert.equal(delaySecondsToKnobAngle(DELAY_MIN_SECONDS), -135);
  assert.equal(delaySecondsToKnobAngle(DELAY_MAX_SECONDS), 135);
  assert.equal(knobAngleToDelaySeconds(-135), DELAY_MIN_SECONDS);
  assert.equal(knobAngleToDelaySeconds(135), DELAY_MAX_SECONDS);

  // Jede Reglerstellung führt auf denselben Sekundenwert zurück.
  for (let seconds = DELAY_MIN_SECONDS; seconds <= DELAY_MAX_SECONDS; seconds += 1) {
    assert.equal(knobAngleToDelaySeconds(delaySecondsToKnobAngle(seconds)), seconds);
  }
});

test('zieht den toten Winkel des Reglers zum näheren Ende', () => {
  assert.equal(knobAngleToDelaySeconds(160), DELAY_MAX_SECONDS);
  // Genau 180 Grad liegt in der Mitte des toten Winkels und fällt auf das untere Ende.
  assert.equal(knobAngleToDelaySeconds(180), DELAY_MIN_SECONDS);
  assert.equal(knobAngleToDelaySeconds(-160), DELAY_MIN_SECONDS);
  assert.equal(knobAngleToDelaySeconds(-181), DELAY_MAX_SECONDS);
  assert.equal(knobAngleToDelaySeconds(Number.NaN), DELAY_DEFAULT_SECONDS);
});

test('zählt die Restzeit bis zur verzögerten Wiedergabe in ganzen Sekunden', () => {
  assert.equal(formatDelayCountdown(15_000), '15');
  assert.equal(formatDelayCountdown(14_200), '15');
  assert.equal(formatDelayCountdown(13_999), '14');
  assert.equal(formatDelayCountdown(1), '1');
  assert.equal(formatDelayCountdown(0), '0');
  assert.equal(formatDelayCountdown(-500), '0');
  assert.equal(formatDelayCountdown(Number.NaN), '0');
});

test('fragt die Kamera nach 60 Bildern pro Sekunde', () => {
  assert.equal(CAMERA_TARGET_FRAME_RATE, 60);
});

test('koppelt die Datenrate der Aufnahme an die gelieferte Bildrate', () => {
  assert.equal(videoBitrateForFrameRate(30), MIN_VIDEO_BITRATE);
  assert.equal(videoBitrateForFrameRate(60), MAX_VIDEO_BITRATE);
  assert.ok(videoBitrateForFrameRate(50) > MIN_VIDEO_BITRATE);
  assert.ok(videoBitrateForFrameRate(50) < MAX_VIDEO_BITRATE);
});

test('fällt ohne bekannte Bildrate auf die kleinste Datenrate zurück', () => {
  assert.equal(videoBitrateForFrameRate(0), MIN_VIDEO_BITRATE);
  assert.equal(videoBitrateForFrameRate(-24), MIN_VIDEO_BITRATE);
  assert.equal(videoBitrateForFrameRate(Number.NaN), MIN_VIDEO_BITRATE);
  assert.equal(videoBitrateForFrameRate(undefined), MIN_VIDEO_BITRATE);
  assert.equal(videoBitrateForFrameRate(1000), MAX_VIDEO_BITRATE);
});

test('puffert kurze Vorläufe mit voller Bildrate', () => {
  assert.equal(delayCaptureFps(DELAY_MIN_SECONDS), DELAY_TARGET_FPS);
  assert.equal(delayCaptureFps(DELAY_DEFAULT_SECONDS), DELAY_TARGET_FPS);
  assert.equal(delayCaptureIntervalMs(DELAY_DEFAULT_SECONDS), 1000 / DELAY_TARGET_FPS);
});

test('hält das Bildbudget des Puffers über alle Vorläufe ein', () => {
  let previous = Number.POSITIVE_INFINITY;
  for (let seconds = DELAY_MIN_SECONDS; seconds <= DELAY_MAX_SECONDS; seconds += 1) {
    const fps = delayCaptureFps(seconds);
    assert.ok(fps <= DELAY_TARGET_FPS && fps >= DELAY_MIN_FPS, `${seconds} s liegt außerhalb der Bildrate`);
    assert.ok(fps * seconds <= DELAY_MAX_BUFFERED_FRAMES + 1, `${seconds} s sprengt das Bildbudget`);
    assert.ok(fps <= previous, 'längerer Vorlauf darf die Bildrate nicht erhöhen');
    previous = fps;
  }
  assert.equal(delayCaptureFps(DELAY_MAX_SECONDS), DELAY_MIN_FPS);
});

test('bleibt bei unbrauchbaren Vorlaufwerten beim Standard', () => {
  assert.equal(delayCaptureFps(Number.NaN), delayCaptureFps(DELAY_DEFAULT_SECONDS));
  assert.equal(delayCaptureFps(999), delayCaptureFps(DELAY_MAX_SECONDS));
});

test('springt in festen Schritten von 0,1 Sekunden', () => {
  assert.equal(PLAYBACK_STEP_SECONDS, 0.1);
  assert.ok(Math.abs(nextStepTime(1, 10, 1) - 1.1) < 1e-9);
  assert.ok(Math.abs(nextStepTime(1, 10, -1) - 0.9) < 1e-9);
});

test('bleibt an beiden Enden des Videos stehen', () => {
  assert.equal(nextStepTime(0, 10, -1), 0);
  assert.equal(nextStepTime(0.05, 10, -1), 0);
  assert.equal(nextStepTime(10, 10, 1), 10);
  assert.equal(nextStepTime(9.95, 10, 1), 10);
});

test('behandelt eine unbekannte Schrittrichtung als Vorwärtssprung', () => {
  assert.equal(nextStepTime(1, 10, 0), nextStepTime(1, 10, 1));
  // Ein negativer Schrittwert darf die Richtung nicht umdrehen.
  assert.equal(nextStepTime(1, 10, -1, -0.1), nextStepTime(1, 10, -1, 0.1));
});

test('liefert ohne brauchbare Werte den Videoanfang', () => {
  assert.equal(nextStepTime(5, 0, 1), 0);
  assert.equal(nextStepTime(Number.NaN, 10, 1), 0);
  assert.equal(nextStepTime(5, 10, 1, Number.NaN), 0);
});
