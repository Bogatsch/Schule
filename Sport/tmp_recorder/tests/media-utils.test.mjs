import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_RECORDING_MS,
  VIDEO_MIME_CANDIDATES,
  formatPlaybackTime,
  formatRecordingTime,
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
