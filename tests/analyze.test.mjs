import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeFrame, flagsFor, groupSegments, DEFAULT_THRESHOLDS } from '../src/analyze.js';
import { makeDemoFrame } from '../src/demo.js';

function rgba(width, height, valueAt) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = valueAt(x, y);
      const offset = (y * width + x) * 4;
      data.set([value, value, value, 255], offset);
    }
  }
  return { data, width, height };
}

test('solid black is dark, has no clipped highlights, and has no image detail', () => {
  const metrics = analyzeFrame(rgba(8, 8, () => 0));
  assert.equal(metrics.brightness, 0);
  assert.equal(metrics.brightFraction, 0);
  assert.equal(metrics.detailVariance, 0);
  assert.deepEqual(new Set(flagsFor(metrics)), new Set(['dark', 'low-detail']));
});

test('solid white is overexposed and retains a correctly normalized brightness', () => {
  const metrics = analyzeFrame(rgba(8, 8, () => 255));
  assert.ok(Math.abs(metrics.brightness - 255) < 1e-8);
  assert.equal(metrics.brightFraction, 1);
  assert.equal(metrics.detailVariance, 0);
  assert.ok(flagsFor(metrics).includes('overexposed'));
  assert.ok(!flagsFor(metrics).includes('dark'));
});

test('removing high-frequency checkerboard texture reduces the detail metric', () => {
  const sharp = analyzeFrame(rgba(32, 24, (x, y) => (x + y) % 2 ? 255 : 0));
  // A 2-by-2 box average of this checkerboard is uniform gray.
  const averaged = analyzeFrame(rgba(32, 24, () => 128));
  assert.ok(sharp.detailVariance > DEFAULT_THRESHOLDS.lowDetail);
  assert.equal(averaged.detailVariance, 0);
  assert.ok(!flagsFor(sharp).includes('low-detail'));
  assert.ok(flagsFor(averaged).includes('low-detail'));
  for (const metrics of [sharp, averaged]) {
    for (const value of Object.values(metrics)) {
      assert.ok(Number.isFinite(value) && value >= 0);
    }
    assert.ok(metrics.brightness <= 255);
    assert.ok(metrics.brightFraction <= 1);
  }
});

test('flag thresholds use the configured limits and do not flag exact boundaries', () => {
  const limits = { darkMean: 40, brightPixel: 240, brightFraction: 0.4, lowDetail: 70 };
  assert.deepEqual(flagsFor({ brightness: 40, brightFraction: 0.4, detailVariance: 70 }, limits), []);
  assert.deepEqual(
    new Set(flagsFor({ brightness: 39, brightFraction: 0.41, detailVariance: 69 }, limits)),
    new Set(['dark', 'overexposed', 'low-detail']),
  );
  const metrics = analyzeFrame(rgba(8, 8, () => 242), limits);
  assert.equal(metrics.brightFraction, 1);
});

test('malformed frame dimensions and pixel buffers are rejected', () => {
  const valid = rgba(8, 8, () => 128);
  for (const width of [0, -8, 3.5, NaN, Infinity]) {
    assert.throws(() => analyzeFrame({ ...valid, width }));
  }
  for (const height of [0, -8, 3.5, NaN, Infinity]) {
    assert.throws(() => analyzeFrame({ ...valid, height }));
  }
  assert.throws(() => analyzeFrame({ ...valid, data: new Uint8ClampedArray(4) }));
  assert.throws(() => analyzeFrame({ ...valid, data: null }));
});

test('synthetic examples exercise measured changes and are deterministic', () => {
  const width = 320;
  const height = 180;
  const metrics = {};
  for (const phase of ['clear', 'dark', 'overexposed', 'blurred']) {
    const data = makeDemoFrame(width, height, phase);
    assert.ok(data instanceof Uint8ClampedArray);
    assert.equal(data.length, width * height * 4);
    assert.deepEqual(data, makeDemoFrame(width, height, phase));
    metrics[phase] = analyzeFrame({ data, width, height });
    assert.ok(Object.values(metrics[phase]).every(Number.isFinite));
  }
  assert.ok(metrics.dark.brightness < metrics.clear.brightness);
  assert.ok(flagsFor(metrics.dark).includes('dark'));
  assert.ok(flagsFor(metrics.overexposed).includes('overexposed'));
  assert.ok(metrics.blurred.detailVariance < metrics.clear.detailVariance);
  assert.ok(flagsFor(metrics.blurred).includes('low-detail'));
});

test('segments are grouped per flag, interrupted by errors, and clipped to duration', () => {
  const samples = [
    { time: 0, status: 'ok', flags: ['dark'] },
    { time: 1, status: 'ok', flags: ['dark', 'low-detail'] },
    { time: 2, status: 'error', flags: [] },
    { time: 3, status: 'ok', flags: ['dark'] },
    { time: 4, status: 'ok', flags: [] },
    { time: 5, status: 'ok', flags: ['dark'] },
    { time: 6, status: 'ok', flags: ['dark'] },
  ];
  const segments = groupSegments(samples, 6.3, 1);
  const comparable = segments.map(({ flag, start, end, firstSample, lastSample, sampleCount }) =>
    ({ flag, start, end, firstSample, lastSample, sampleCount }));
  comparable.sort((a, b) => a.start - b.start || a.flag.localeCompare(b.flag));
  assert.deepEqual(comparable, [
    { flag: 'dark', start: 0, end: 2, firstSample: 0, lastSample: 1, sampleCount: 2 },
    { flag: 'low-detail', start: 1, end: 2, firstSample: 1, lastSample: 1, sampleCount: 1 },
    { flag: 'dark', start: 3, end: 4, firstSample: 3, lastSample: 3, sampleCount: 1 },
    { flag: 'dark', start: 5, end: 6.3, firstSample: 5, lastSample: 6, sampleCount: 2 },
  ]);
});

test('missing sample times do not become measured coverage', () => {
  const segments = groupSegments([
    { time: 0, status: 'ok', flags: ['dark'] },
    { time: 2, status: 'ok', flags: ['dark'] },
  ], 3, 1);
  assert.deepEqual(segments.map(({ start, end }) => [start, end]), [[0, 1], [2, 3]]);
  assert.deepEqual(groupSegments([], 0, 1), []);
});
