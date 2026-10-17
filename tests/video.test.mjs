import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { LIMITS, validateFile, validateMetadata, waitForMedia, sampleVideo } from '../src/video.js';

function assertClean(video, signal, event = 'loadedmetadata') {
  assert.equal(getEventListeners(video, event).length, 0, 'success listeners must be released');
  assert.equal(getEventListeners(video, 'error').length, 0, 'error listeners must be released');
  if (signal) assert.equal(getEventListeners(signal, 'abort').length, 0, 'abort listeners must be released');
}

test('file size limit accepts 200 MiB exactly and rejects larger or empty inputs', () => {
  assert.equal(LIMITS.maxBytes, 200 * 1024 * 1024);
  assert.doesNotThrow(() => validateFile({ size: LIMITS.maxBytes }));
  assert.doesNotThrow(() => validateFile({ size: 1 }));
  assert.throws(() => validateFile({ size: LIMITS.maxBytes + 1 }), /200|larger|smaller/i);
  for (const size of [0, -1, Infinity, NaN, undefined]) {
    assert.throws(() => validateFile({ size }));
  }
  assert.throws(() => validateFile(null));
});

test('metadata accepts 120 seconds exactly and rejects invalid duration or dimensions', () => {
  assert.equal(LIMITS.maxDuration, 120);
  assert.doesNotThrow(() => validateMetadata(120, 1920, 1080));
  assert.throws(() => validateMetadata(120.01, 1920, 1080), /120|minutes|trim/i);
  for (const duration of [0, -1, Infinity, NaN]) {
    assert.throws(() => validateMetadata(duration, 320, 180));
  }
  for (const dimension of [0, -1, 2, Infinity, NaN, undefined]) {
    assert.throws(() => validateMetadata(1, dimension, 180));
    assert.throws(() => validateMetadata(1, 320, dimension));
  }
});

test('an already canceled media wait fails without leaving listeners', async () => {
  const video = new EventTarget();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(async () => waitForMedia(video, 'loadedmetadata', controller.signal), { name: 'AbortError' });
  assertClean(video, controller.signal);
});

test('canceling a pending media wait rejects with AbortError and releases listeners', async () => {
  const video = new EventTarget();
  const controller = new AbortController();
  const pending = waitForMedia(video, 'loadedmetadata', controller.signal, 1000);
  assert.equal(getEventListeners(video, 'loadedmetadata').length, 1);
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  controller.abort();
  await rejected;
  assertClean(video, controller.signal);
});

test('metadata success resolves and releases both media and abort listeners', async () => {
  const video = new EventTarget();
  const controller = new AbortController();
  const pending = waitForMedia(video, 'loadedmetadata', controller.signal, 1000);
  video.dispatchEvent(new Event('loadedmetadata'));
  await pending;
  assertClean(video, controller.signal);
  // A later source error or cancellation must not affect this completed wait.
  video.dispatchEvent(new Event('error'));
  controller.abort();
});

test('decode errors give a recovery suggestion and release listeners', async () => {
  const video = new EventTarget();
  const controller = new AbortController();
  const pending = waitForMedia(video, 'loadedmetadata', controller.signal, 1000);
  const rejected = assert.rejects(pending, error => {
    assert.match(error.message, /decod/i);
    assert.match(error.message, /MP4|WebM|re.encode/i);
    return true;
  });
  video.dispatchEvent(new Event('error'));
  await rejected;
  assertClean(video, controller.signal);
});

test('a missing media event times out and releases listeners', async () => {
  const video = new EventTarget();
  const controller = new AbortController();
  await assert.rejects(waitForMedia(video, 'seeked', controller.signal, 5), /timed out.*seeked/i);
  assertClean(video, controller.signal, 'seeked');
});

test('sampling waits for an explicit first seek even when readyState is 4 and time is zero', async () => {
  const sequence = [];
  class VideoStub extends EventTarget {
    duration = 2.25;
    videoWidth = 8;
    videoHeight = 6;
    readyState = 4;
    seeking = false;
    drawableTime = null;
    #time = 0;
    pause() {}
    get currentTime() { return this.#time; }
    set currentTime(time) {
      this.#time = time;
      this.seeking = true;
      this.drawableTime = null;
      sequence.push(['seek-start', time]);
      queueMicrotask(() => {
        this.seeking = false;
        this.drawableTime = time;
        sequence.push(['seek-complete', time]);
        this.dispatchEvent(new Event('seeked'));
      });
    }
  }
  const video = new VideoStub();
  const context = {
    drawImage(source) {
      assert.equal(source, video);
      assert.equal(source.seeking, false, 'drawing must await seek completion');
      assert.equal(source.drawableTime, source.currentTime, 'metadata readiness is not a drawable frame');
      sequence.push(['draw', source.currentTime]);
    },
    getImageData(_x, _y, width, height) {
      const data = new Uint8ClampedArray(width * height * 4).fill(64 + video.currentTime);
      return { data, width, height };
    },
  };
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement(tag) {
        assert.equal(tag, 'canvas');
        return { getContext: () => context };
      },
    },
  });
  try {
    const samples = [];
    const result = await sampleVideo(video, { onFrame: sample => samples.push(sample) });
    assert.deepEqual(samples.map(({ time, status, frame }) => [time, status, frame?.data[0]]), [
      [0, 'ok', 64], [1, 'ok', 65], [2, 'ok', 66],
    ]);
    assert.deepEqual(sequence, [
      ['seek-start', 0], ['seek-complete', 0], ['draw', 0],
      ['seek-start', 1], ['seek-complete', 1], ['draw', 1],
      ['seek-start', 2], ['seek-complete', 2], ['draw', 2],
    ]);
    assert.equal(result.count, 3);
    assertClean(video, undefined, 'seeked');
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else delete globalThis.document;
  }
});
