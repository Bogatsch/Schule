import qrcode from './vendor/qrcode-generator/qrcode-2.0.4.js';

export function drawSubmissionQr(canvas, submissionUrl) {
  const code = qrcode(0, 'M');
  code.addData(submissionUrl, 'Byte');
  code.make();

  const modules = code.getModuleCount();
  const moduleSize = 6;
  const margin = 4;
  const size = (modules + margin * 2) * moduleSize;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, size, size);
  context.fillStyle = '#000';
  for (let row = 0; row < modules; row += 1) {
    for (let column = 0; column < modules; column += 1) {
      if (code.isDark(row, column)) {
        context.fillRect((column + margin) * moduleSize, (row + margin) * moduleSize, moduleSize, moduleSize);
      }
    }
  }
}
