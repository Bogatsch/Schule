import assert from 'node:assert/strict';
import test from 'node:test';

const { convertWebMToMp4, isWebMVideo } = await import('../video-converter.js');

test('erkennt ausschließlich WebM-Videos als Konvertierungskandidaten', () => {
  assert.equal(isWebMVideo('video/webm;codecs=vp9'), true);
  assert.equal(isWebMVideo('video/mp4'), false);
  assert.equal(isWebMVideo('image/webp'), false);
});

test('wandelt WebM lokal in einen echten MP4-Blob um', async () => {
  const originalVideoDecoder = globalThis.VideoDecoder;
  const originalVideoEncoder = globalThis.VideoEncoder;
  const originalMediabunny = globalThis.Mediabunny;
  const events = [];
  let disposed = false;

  class FakeInput {
    dispose() {
      disposed = true;
    }
  }
  class FakeBlobSource {}
  class FakeBufferTarget {
    constructor() {
      this.buffer = null;
    }
  }
  class FakeMp4OutputFormat {}
  class FakeOutput {
    constructor({ target }) {
      this.target = target;
    }
  }
  class FakeQuality {
    constructor(value) {
      this.value = value;
    }
  }

  try {
    globalThis.VideoDecoder = class {};
    globalThis.VideoEncoder = class {};
    globalThis.Mediabunny = {
      ALL_FORMATS: [],
      BlobSource: FakeBlobSource,
      BufferTarget: FakeBufferTarget,
      Input: FakeInput,
      Mp4OutputFormat: FakeMp4OutputFormat,
      Output: FakeOutput,
      Quality: FakeQuality,
      async canEncodeVideo(codec) {
        return codec === 'avc';
      },
      Conversion: {
        async init(options) {
          assert.equal(options.video.codec, 'avc');
          assert.equal(options.video.forceTranscode, true);
          assert.equal(options.audio.discard, true);
          return {
            isValid: true,
            state: 'idle',
            onProgress: null,
            async execute() {
              this.state = 'executing';
              this.onProgress?.(0.5);
              options.output.target.buffer = new Uint8Array([
                0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109
              ]).buffer;
              this.state = 'done';
            },
            async cancel() {
              this.state = 'canceled';
            }
          };
        }
      }
    };

    const output = await convertWebMToMp4(
      new Blob(['webm'], { type: 'video/webm;codecs=vp8' }),
      { title: 'Sprungwurf', onProgress: (event) => events.push(event) }
    );

    assert.equal(output.type, 'video/mp4');
    assert.ok(output.size > 8);
    assert.equal(disposed, true);
    assert.ok(events.some((event) => event.phase === 'converting' && event.progress === 0.5));
    assert.equal(events.at(-1).phase, 'finalizing');
  } finally {
    if (originalVideoDecoder === undefined) {
      delete globalThis.VideoDecoder;
    } else {
      globalThis.VideoDecoder = originalVideoDecoder;
    }
    if (originalVideoEncoder === undefined) {
      delete globalThis.VideoEncoder;
    } else {
      globalThis.VideoEncoder = originalVideoEncoder;
    }
    if (originalMediabunny === undefined) {
      delete globalThis.Mediabunny;
    } else {
      globalThis.Mediabunny = originalMediabunny;
    }
  }
});

test('bricht eine bereits abgemeldete Konvertierung vor dem Start ab', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    convertWebMToMp4(new Blob(['webm'], { type: 'video/webm' }), { signal: controller.signal }),
    { name: 'AbortError' }
  );
});
