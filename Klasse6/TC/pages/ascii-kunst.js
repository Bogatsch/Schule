const imageUpload = document.getElementById('imageUpload');
const imageUrl = document.getElementById('imageUrl');
const loadUrlBtn = document.getElementById('loadUrlBtn');
const widthRange = document.getElementById('widthRange');
const brightnessRange = document.getElementById('brightnessRange');
const contrastRange = document.getElementById('contrastRange');
const charsetSelect = document.getElementById('charsetSelect');
const invertToggle = document.getElementById('invertToggle');
const widthValue = document.getElementById('widthValue');
const brightnessValue = document.getElementById('brightnessValue');
const contrastValue = document.getElementById('contrastValue');
const sourcePreview = document.getElementById('sourcePreview');
const previewFrame = document.getElementById('previewFrame');
const previewPlaceholder = document.getElementById('previewPlaceholder');
const asciiOutput = document.getElementById('asciiOutput');
const statusBox = document.getElementById('statusBox');
const imageMeta = document.getElementById('imageMeta');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const canvas = document.getElementById('imageCanvas');
const sampleButtons = Array.from(document.querySelectorAll('.sample-btn'));

const ctx = canvas.getContext('2d', { willReadFrequently: true });
const characterSets = {
  classic: '@%#*+=-:. ',
  blocks: '█▓▒░ ',
  binary: '10 ',
  dots: '@#xo;:,. '
};

const state = {
  image: null,
  imageLabel: '',
  imageSourceUrl: '',
  downloadUrl: ''
};

const setStatus = (message, isError = false) => {
  statusBox.textContent = message;
  statusBox.classList.toggle('error', isError);
};

const updateControlLabels = () => {
  widthValue.textContent = widthRange.value;
  brightnessValue.textContent = brightnessRange.value;
  contrastValue.textContent = `${contrastRange.value}%`;
};

const revokeDownloadUrl = () => {
  if (!state.downloadUrl) {
    return;
  }

  URL.revokeObjectURL(state.downloadUrl);
  state.downloadUrl = '';
};

const updateMeta = (width, height) => {
  imageMeta.textContent = `${state.imageLabel || 'Bild'}: ${width} × ${height} Pixel`;
};

const setPreview = (image, label) => {
  state.image = image;
  state.imageLabel = label;
  sourcePreview.src = image.src;
  sourcePreview.hidden = false;
  previewPlaceholder.hidden = true;
  previewFrame.classList.remove('empty');
  updateMeta(image.naturalWidth || image.width, image.naturalHeight || image.height);
};

const adjustBrightnessContrast = (value, brightness, contrastMultiplier) => {
  const brightened = value + brightness;
  const contrasted = ((brightened - 128) * contrastMultiplier) + 128;
  return Math.max(0, Math.min(255, contrasted));
};

const buildAsciiArt = () => {
  if (!state.image) {
    asciiOutput.textContent = 'Lade ein Bild hoch oder wähle ein Beispiel.';
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
    return;
  }

  const targetWidth = Number.parseInt(widthRange.value, 10);
  const brightness = Number.parseInt(brightnessRange.value, 10);
  const contrastMultiplier = Number.parseInt(contrastRange.value, 10) / 100;
  const characters = characterSets[charsetSelect.value] || characterSets.classic;
  const sourceWidth = state.image.naturalWidth || state.image.width;
  const sourceHeight = state.image.naturalHeight || state.image.height;
  const aspectRatio = sourceHeight / Math.max(sourceWidth, 1);
  const targetHeight = Math.max(1, Math.round(targetWidth * aspectRatio * 0.55));

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(state.image, 0, 0, targetWidth, targetHeight);

  let imageData;

  try {
    imageData = ctx.getImageData(0, 0, targetWidth, targetHeight).data;
  } catch {
    setStatus('Der Bildlink erlaubt keine Pixel-Auswertung. Nutze in diesem Fall bitte den Upload oder ein anderes Bild.', true);
    asciiOutput.textContent = 'Die ASCII-Ausgabe konnte für dieses Bild nicht erstellt werden.';
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
    return;
  }

  const rows = [];

  for (let y = 0; y < targetHeight; y += 1) {
    let row = '';

    for (let x = 0; x < targetWidth; x += 1) {
      const index = (y * targetWidth + x) * 4;
      const red = imageData[index];
      const green = imageData[index + 1];
      const blue = imageData[index + 2];
      const alpha = imageData[index + 3];

      if (alpha < 32) {
        row += ' ';
        continue;
      }

      const grayscale = (0.299 * red) + (0.587 * green) + (0.114 * blue);
      let adjusted = adjustBrightnessContrast(grayscale, brightness, contrastMultiplier);

      if (invertToggle.checked) {
        adjusted = 255 - adjusted;
      }

      const normalized = adjusted / 255;
      const charIndex = Math.min(
        characters.length - 1,
        Math.floor(normalized * (characters.length - 1))
      );

      row += characters.charAt(charIndex);
    }

    rows.push(row);
  }

  asciiOutput.textContent = rows.join('\n');
  setStatus(`ASCII-Kunst erstellt: ${targetWidth} × ${targetHeight} Zeichen.`, false);
  copyBtn.disabled = false;
  downloadBtn.disabled = false;
};

const loadImageElement = (source, label) => new Promise((resolve, reject) => {
  const image = new Image();

  image.decoding = 'async';
  image.onload = () => resolve({ image, label });
  image.onerror = () => reject(new Error('image-load-failed'));
  image.src = source;
});

const applyLoadedImage = async (source, label) => {
  const { image } = await loadImageElement(source, label);
  setPreview(image, label);
  buildAsciiArt();
};

const handleFileUpload = async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  if (!file.type.startsWith('image/')) {
    setStatus('Bitte lade eine Bilddatei hoch.', true);
    return;
  }

  revokeDownloadUrl();
  const objectUrl = URL.createObjectURL(file);

  try {
    await applyLoadedImage(objectUrl, file.name);
    state.downloadUrl = objectUrl;
    setStatus(`Bild geladen: ${file.name}`, false);
  } catch {
    URL.revokeObjectURL(objectUrl);
    setStatus('Das hochgeladene Bild konnte nicht gelesen werden.', true);
  }
};

const loadImageFromUrl = async () => {
  const url = imageUrl.value.trim();
  if (!url) {
    setStatus('Bitte gib zuerst einen Bildlink ein.', true);
    return;
  }

  revokeDownloadUrl();
  setStatus('Bildlink wird geladen...', false);
  let objectUrl = '';

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error('fetch-failed');
    }

    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) {
      throw new Error('not-image');
    }

    objectUrl = URL.createObjectURL(blob);
    await applyLoadedImage(objectUrl, 'Bildlink');
    state.downloadUrl = objectUrl;
    setStatus('Bildlink erfolgreich geladen.', false);
  } catch {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    setStatus('Der Bildlink konnte nicht geladen werden. Prüfe den Link oder nutze stattdessen den Upload.', true);
  }
};

const copyAsciiOutput = async () => {
  try {
    await navigator.clipboard.writeText(asciiOutput.textContent);
    setStatus('ASCII-Ausgabe wurde in die Zwischenablage kopiert.', false);
  } catch {
    setStatus('Kopieren wurde vom Browser blockiert.', true);
  }
};

const downloadAsciiOutput = () => {
  const content = asciiOutput.textContent;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'ascii-kunst.txt';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  setStatus('ASCII-Ausgabe wurde als TXT-Datei gespeichert.', false);
};

imageUpload.addEventListener('change', handleFileUpload);
loadUrlBtn.addEventListener('click', loadImageFromUrl);
imageUrl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    loadImageFromUrl();
  }
});

[widthRange, brightnessRange, contrastRange, charsetSelect, invertToggle].forEach((element) => {
  element.addEventListener('input', () => {
    updateControlLabels();
    buildAsciiArt();
  });
});

sampleButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    revokeDownloadUrl();
    const sampleSource = button.dataset.sampleSrc;
    const label = button.textContent.trim();

    try {
      await applyLoadedImage(sampleSource, label);
      setStatus(`Beispiel geladen: ${label}`, false);
    } catch {
      setStatus('Das Beispielbild konnte nicht geladen werden.', true);
    }
  });
});

copyBtn.addEventListener('click', copyAsciiOutput);
downloadBtn.addEventListener('click', downloadAsciiOutput);

window.addEventListener('beforeunload', () => {
  revokeDownloadUrl();
});

updateControlLabels();