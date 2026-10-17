// Drawn pixels, not road footage. No random or external input is used.
export function makeDemoFrame(width, height, phase = 'clear') {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 3 || height < 3) {
    throw new RangeError('Demo dimensions must be at least 3 × 3.');
  }
  if (!['clear', 'dark', 'overexposed', 'blurred'].includes(phase)) throw new Error('Unknown demo phase.');
  const pixels = new Uint8ClampedArray(width * height * 4);
  const horizon = height * 0.42;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let color;
      const t = Math.max(0, (y - horizon) / (height - horizon));
      const halfRoad = width * (0.06 + 0.4 * t);
      if (y < horizon) {
        color = [125 + 35 * y / height, 176 + 25 * y / height, 207];
        // A textured distant tree line.
        if (y > horizon - 11 - 7 * Math.sin(x * .13)) color = [56, 96, 75];
      } else if (Math.abs(x - width / 2) < halfRoad) {
        const texture = ((x * 17 + y * 31) % 9) - 4;
        color = [76 + texture, 83 + texture, 88 + texture];
        if (Math.abs(x - width / 2) < 1 + t * 2 && Math.floor(t * 12) % 2 === 0) color = [243, 223, 155];
        if (Math.abs(Math.abs(x - width / 2) - halfRoad + 3) < 1 + t) color = [229, 232, 219];
      } else {
        const texture = ((x * 7 + y * 13) % 20);
        color = [75 + texture, 113 + texture, 76 + texture];
      }
      // A lead vehicle, windshield, and two tail lights.
      const carX = width * .56, carY = height * .58;
      if (x > carX - width * .065 && x < carX + width * .065 && y > carY - height * .04 && y < carY + height * .12) {
        color = y < carY + height * .02 ? [39, 67, 88] : [184, 196, 200];
        if (y > carY + height * .065 && y < carY + height * .087 && Math.abs(x - carX) > width * .04) color = [201, 64, 49];
      }
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) pixels[i + c] = color[c];
      pixels[i + 3] = 255;
    }
  }
  if (phase === 'blurred') return boxBlur(pixels, width, height, 6);
  if (phase === 'dark' || phase === 'overexposed') {
    for (let i = 0; i < pixels.length; i += 4) for (let c = 0; c < 3; c++) {
      pixels[i + c] = phase === 'dark' ? pixels[i + c] * .12 : 248 + pixels[i + c] * 7 / 255;
    }
  }
  return pixels;
}

function boxBlur(data, width, height, radius) {
  const result = new Uint8ClampedArray(data.length);
  const integralWidth = width + 1;
  for (let c = 0; c < 3; c++) {
    const integral = new Float64Array((width + 1) * (height + 1));
    for (let y = 1; y <= height; y++) {
      let row = 0;
      for (let x = 1; x <= width; x++) {
        row += data[((y - 1) * width + x - 1) * 4 + c];
        integral[y * integralWidth + x] = row + integral[(y - 1) * integralWidth + x];
      }
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius), x1 = Math.min(width, x + radius + 1);
      const y0 = Math.max(0, y - radius), y1 = Math.min(height, y + radius + 1);
      const sum = integral[y1 * integralWidth + x1] - integral[y0 * integralWidth + x1]
        - integral[y1 * integralWidth + x0] + integral[y0 * integralWidth + x0];
      result[(y * width + x) * 4 + c] = sum / ((x1 - x0) * (y1 - y0));
      result[(y * width + x) * 4 + 3] = 255;
    }
  }
  return result;
}

export const DEMO_PHASES = ['clear', 'dark', 'overexposed', 'blurred'];
export const DEMO_DURATION = 16;
export function demoPhaseAt(time) { return DEMO_PHASES[Math.min(3, Math.floor(time / 4))]; }
