import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DELAY_DEFAULT_SECONDS,
  DELAY_MAX_SECONDS,
  DELAY_MIN_SECONDS,
  MAX_RECORDING_MS,
  VIDEO_MIME_CANDIDATES,
  clampDelaySeconds,
  delaySecondsToKnobAngle,
  formatDelayCountdown,
  formatPlaybackTime,
  formatRecordingTime,
  knobAngleToDelaySeconds,
  selectSupportedVideoMimeType
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
