const MEDIABUNNY_VERSION = '1.55.2';
const MEDIABUNNY_URL = new URL(
  `./vendor/mediabunny/mediabunny-${MEDIABUNNY_VERSION}.min.js?v=${MEDIABUNNY_VERSION}`,
  import.meta.url
).href;

let mediabunnyLoadPromise = null;

export class VideoConversionError extends Error {
  constructor(code, message, cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = 'VideoConversionError';
    this.code = code;
  }
}

function createAbortError() {
  return new DOMException('Die MP4-Konvertierung wurde abgebrochen.', 'AbortError');
}

function getLoadedMediabunny() {
  const library = globalThis.Mediabunny;
  if (
    !library
    || typeof library.Input !== 'function'
    || typeof library.Output !== 'function'
    || typeof library.Conversion?.init !== 'function'
  ) {
    return null;
  }
  return library;
}

function loadMediabunny() {
  const loaded = getLoadedMediabunny();
  if (loaded) {
    return Promise.resolve(loaded);
  }
  if (mediabunnyLoadPromise) {
    return mediabunnyLoadPromise;
  }
  if (typeof document === 'undefined') {
    return Promise.reject(new VideoConversionError(
      'library-unavailable',
      'Der lokale MP4-Konverter ist nicht verfügbar.'
    ));
  }

  mediabunnyLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = MEDIABUNNY_URL;
    script.async = true;
    script.dataset.mediabunnyLoader = MEDIABUNNY_VERSION;
    script.addEventListener('load', () => {
      const library = getLoadedMediabunny();
      if (library) {
        resolve(library);
      } else {
        reject(new VideoConversionError(
          'library-unavailable',
          'Der lokale MP4-Konverter konnte nicht gestartet werden.'
        ));
      }
    }, { once: true });
    script.addEventListener('error', () => {
      reject(new VideoConversionError(
        'library-unavailable',
        'Der lokale MP4-Konverter konnte nicht geladen werden.'
      ));
    }, { once: true });
    document.head.append(script);
  }).catch((error) => {
    mediabunnyLoadPromise = null;
    throw error;
  });

  return mediabunnyLoadPromise;
}

export function isWebMVideo(mimeType) {
  return String(mimeType || '').split(';', 1)[0].trim().toLowerCase() === 'video/webm';
}

async function runMp4Conversion(blob, library, {
  title,
  signal,
  onProgress,
  progressPhase,
  video
}) {
  const {
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    Conversion,
    Input,
    Mp4OutputFormat,
    Output
  } = library;
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(blob)
  });
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: false }),
    target
  });
  let conversion = null;
  const abortConversion = () => {
    void conversion?.cancel();
  };

  try {
    conversion = await Conversion.init({
      input,
      output,
      tracks: 'primary',
      video,
      audio: { discard: true },
      tags: title ? { title } : {}
    });

    if (signal?.aborted) {
      throw createAbortError();
    }
    if (!conversion.isValid) {
      throw new VideoConversionError(
        'unsupported',
        'Die Video-Codecs dieses Geräts erlauben keine MP4-Konvertierung.'
      );
    }

    signal?.addEventListener('abort', abortConversion, { once: true });
    conversion.onProgress = (progress) => {
      onProgress?.({
        phase: progressPhase,
        progress: Math.max(0, Math.min(1, Number(progress) || 0))
      });
    };
    await conversion.execute();

    if (signal?.aborted) {
      throw createAbortError();
    }
    if (!(target.buffer instanceof ArrayBuffer) || target.buffer.byteLength <= 0) {
      throw new VideoConversionError('empty-output', 'Die erzeugte MP4-Datei ist leer.');
    }

    onProgress?.({ phase: 'finalizing', progress: 1 });
    return new Blob([target.buffer], { type: 'video/mp4' });
  } catch (error) {
    if (signal?.aborted || error?.name === 'ConversionCanceledError') {
      throw createAbortError();
    }
    throw error;
  } finally {
    signal?.removeEventListener('abort', abortConversion);
    if (conversion && conversion.state !== 'done' && conversion.state !== 'canceled') {
      await conversion.cancel().catch(() => {});
    }
    input.dispose();
  }
}

export async function convertWebMToMp4(blob, {
  title = '',
  signal = null,
  onProgress = null
} = {}) {
  if (!(blob instanceof Blob) || blob.size <= 0 || !isWebMVideo(blob.type)) {
    throw new VideoConversionError('invalid-input', 'Es wurde kein gültiges WebM-Video übergeben.');
  }
  if (signal?.aborted) {
    throw createAbortError();
  }

  onProgress?.({ phase: 'loading', progress: 0 });
  const library = await loadMediabunny();
  if (signal?.aborted) {
    throw createAbortError();
  }

  const { Quality, canEncodeVideo } = library;
  const failedAttempts = [];
  const hasWebCodecs = (
    typeof globalThis.VideoDecoder === 'function'
    && typeof globalThis.VideoEncoder === 'function'
  );
  let canEncodeAvc = false;
  if (hasWebCodecs && typeof canEncodeVideo === 'function') {
    try {
      canEncodeAvc = await canEncodeVideo('avc');
    } catch {
      canEncodeAvc = false;
    }
  }

  if (canEncodeAvc) {
    // Der bewährte Safari-/iPad-Pfad bleibt zuerst. Andere Browser erhalten
    // danach einen zweiten Versuch ohne festgelegten Hardware-Encoder.
    for (const hardwareAcceleration of ['prefer-hardware', 'no-preference']) {
      try {
        return await runMp4Conversion(blob, library, {
          title,
          signal,
          onProgress,
          progressPhase: 'converting',
          video: {
            codec: 'avc',
            forceTranscode: true,
            hardwareAcceleration,
            keyFrameInterval: 2,
            quality: new Quality('high')
          }
        });
      } catch (error) {
        if (error?.name === 'AbortError') {
          throw error;
        }
        failedAttempts.push(error);
      }
    }
  }

  // Firefox und Chrome-Konfigurationen ohne nutzbaren H.264-Encoder können
  // VP8/VP9-Pakete verlustfrei und ohne WebCodecs in einen MP4-Container kopieren.
  try {
    return await runMp4Conversion(blob, library, {
      title,
      signal,
      onProgress,
      progressPhase: 'remuxing',
      video: { forceTranscode: false }
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    failedAttempts.push(error);
  }

  throw new VideoConversionError(
    'conversion-failed',
    'Das WebM-Video konnte auf diesem Gerät nicht in MP4 umgewandelt werden.',
    failedAttempts.at(-1) || null
  );
}
