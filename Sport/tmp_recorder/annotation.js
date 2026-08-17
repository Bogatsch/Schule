const DEFAULT_COLOR = '#ef4f3f';

export function setupVideoAnnotation({ statusElement = null } = {}) {
  const dialog = document.querySelector('#annotation-dialog');
  const dialogTitle = document.querySelector('#annotation-dialog-title');
  const closeButton = document.querySelector('#annotation-close');
  const stage = document.querySelector('#annotation-canvas-stage');
  const frameCanvas = document.querySelector('#annotation-frame-canvas');
  const drawingCanvas = document.querySelector('#annotation-drawing-canvas');
  const toolButtons = [...document.querySelectorAll('[data-annotation-tool]')];
  const colorButtons = [...document.querySelectorAll('[data-annotation-color]')];

  if (!dialog || !dialogTitle || !closeButton || !stage || !frameCanvas || !drawingCanvas) {
    return {
      open: () => false,
      close: () => {}
    };
  }

  const frameContext = frameCanvas.getContext('2d', { alpha: false });
  const drawingContext = drawingCanvas.getContext('2d');
  if (!frameContext || !drawingContext) {
    return {
      open: () => false,
      close: () => {}
    };
  }
  let currentTool = 'pen';
  let currentColor = DEFAULT_COLOR;
  let activePointerId = null;
  let trigger = null;

  function fitStage() {
    if (!dialog.open || !frameCanvas.width || !frameCanvas.height) {
      return;
    }
    const shell = dialog.querySelector('.annotation-dialog-shell');
    const header = dialog.querySelector('.annotation-dialog-header');
    const toolbar = dialog.querySelector('.annotation-toolbar');
    const shellStyle = window.getComputedStyle(shell);
    const horizontalPadding = parseFloat(shellStyle.paddingLeft) + parseFloat(shellStyle.paddingRight);
    const verticalPadding = parseFloat(shellStyle.paddingTop) + parseFloat(shellStyle.paddingBottom);
    const availableWidth = Math.max(1, shell.clientWidth - horizontalPadding);
    const availableHeight = Math.max(
      120,
      window.innerHeight - verticalPadding - header.offsetHeight - toolbar.offsetHeight - 48
    );
    const aspectRatio = frameCanvas.width / frameCanvas.height;
    stage.style.width = `${Math.floor(Math.min(availableWidth, availableHeight * aspectRatio))}px`;
  }

  function showStatus(message) {
    if (statusElement) {
      statusElement.textContent = message;
    }
  }

  function selectTool(tool) {
    currentTool = tool === 'eraser' ? 'eraser' : 'pen';
    toolButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.annotationTool === currentTool));
    });
  }

  function selectColor(color) {
    currentColor = color || DEFAULT_COLOR;
    colorButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.annotationColor === currentColor));
    });
    selectTool('pen');
  }

  function clearCanvases() {
    activePointerId = null;
    frameCanvas.width = 0;
    frameCanvas.height = 0;
    drawingCanvas.width = 0;
    drawingCanvas.height = 0;
    stage.style.removeProperty('--annotation-aspect-ratio');
    stage.style.removeProperty('width');
  }

  function close({ restoreFocus = true } = {}) {
    const previousTrigger = trigger;
    trigger = null;
    if (dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
      clearCanvases();
    }
    if (restoreFocus && previousTrigger?.isConnected) {
      previousTrigger.focus({ preventScroll: true });
    }
  }

  function open(video, label, sourceButton) {
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      showStatus('Der aktuelle Videoframe ist noch nicht verfügbar. Starte das Video kurz und versuche es erneut.');
      return false;
    }

    video.pause();
    const scale = Math.min(1, 1920 / video.videoWidth, 1080 / video.videoHeight);
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));

    frameCanvas.width = width;
    frameCanvas.height = height;
    drawingCanvas.width = width;
    drawingCanvas.height = height;
    drawingContext.clearRect(0, 0, width, height);

    try {
      frameContext.drawImage(video, 0, 0, width, height);
    } catch {
      clearCanvases();
      showStatus('Der aktuelle Videoframe konnte nicht übernommen werden.');
      return false;
    }

    trigger = sourceButton;
    dialogTitle.textContent = label || 'Videoframe annotieren';
    stage.style.setProperty('--annotation-aspect-ratio', `${width} / ${height}`);
    selectColor(DEFAULT_COLOR);

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    window.requestAnimationFrame(() => {
      fitStage();
      toolButtons.find((button) => button.dataset.annotationTool === 'pen')?.focus();
    });
    return true;
  }

  function getCanvasPoint(event) {
    const bounds = drawingCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * (drawingCanvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (drawingCanvas.height / bounds.height)
    };
  }

  function prepareStroke() {
    const relativeSize = Math.max(drawingCanvas.width, drawingCanvas.height);
    drawingContext.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';
    drawingContext.strokeStyle = currentColor;
    drawingContext.lineWidth = currentTool === 'eraser'
      ? Math.max(20, relativeSize * 0.03)
      : Math.max(5, relativeSize * 0.007);
    drawingContext.lineCap = 'round';
    drawingContext.lineJoin = 'round';
  }

  function beginStroke(event) {
    if (activePointerId !== null || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }
    event.preventDefault();
    activePointerId = event.pointerId;
    try {
      drawingCanvas.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetische Zeigereignisse und ältere Browser unterstützen Pointer Capture teils nur eingeschränkt.
    }
    prepareStroke();
    const point = getCanvasPoint(event);
    drawingContext.beginPath();
    drawingContext.moveTo(point.x, point.y);
    drawingContext.lineTo(point.x + 0.01, point.y + 0.01);
    drawingContext.stroke();
  }

  function continueStroke(event) {
    if (event.pointerId !== activePointerId) {
      return;
    }
    event.preventDefault();
    const coalescedEvents = typeof event.getCoalescedEvents === 'function'
      ? event.getCoalescedEvents()
      : [];
    const pointerEvents = coalescedEvents.length ? coalescedEvents : [event];
    pointerEvents.forEach((pointerEvent) => {
      const point = getCanvasPoint(pointerEvent);
      drawingContext.lineTo(point.x, point.y);
    });
    drawingContext.stroke();
  }

  function endStroke(event) {
    if (event.pointerId !== activePointerId) {
      return;
    }
    event.preventDefault();
    drawingContext.closePath();
    try {
      drawingCanvas.releasePointerCapture?.(event.pointerId);
    } catch {
      // Der Zeiger kann beim Verlassen des Dialogs bereits freigegeben worden sein.
    }
    activePointerId = null;
  }

  toolButtons.forEach((button) => {
    button.addEventListener('click', () => selectTool(button.dataset.annotationTool));
  });
  colorButtons.forEach((button) => {
    button.addEventListener('click', () => selectColor(button.dataset.annotationColor));
  });
  drawingCanvas.addEventListener('pointerdown', beginStroke);
  drawingCanvas.addEventListener('pointermove', continueStroke);
  drawingCanvas.addEventListener('pointerup', endStroke);
  drawingCanvas.addEventListener('pointercancel', endStroke);
  closeButton.addEventListener('click', () => close());
  dialog.addEventListener('close', () => {
    trigger = null;
    clearCanvases();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      close();
    }
  });
  window.addEventListener('resize', fitStage);

  return { open, close };
}
