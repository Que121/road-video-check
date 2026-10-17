# Road video check

A local browser prototype for finding road-video frames worth a second look. It samples a short clip, measures darkness, bright-pixel fraction, and local detail, then links review flags to frames and time ranges. CSV and JSON exports contain the measurements and settings.

The working label is provisional. This repository contains implementation and technical documentation; it is not a completed hackathon entry or the learner's submission description.

## Run locally

Install Node.js 20 or newer, open a terminal in this directory, and run:

```sh
node serve.mjs
```

Open **http://127.0.0.1:8791/**. No package installation, API key, account, or build step is required. Stop the server with Ctrl+C. The server binds only to this computer's loopback interface.

Use **Try the synthetic demo** for generated frames, or choose a video from your computer and select **Analyze at 1 frame / second**. Select a timeline bar or flagged interval to inspect its sampled frame. For a local clip, the original video also seeks to that time. Export buttons become available after a complete analysis.

## Boundaries and interpretation

- Up to 120 seconds and 200 MiB per clip; browser-supported video codecs only. MP4 and WebM container support depends on the browser and contained codec.
- One frame per second, resized to a maximum analysis width of 320 pixels while preserving aspect ratio. Events between samples can be missed.
- Dark: mean encoded-RGB grayscale below 35. Overexposed: more than 35% of pixels at grayscale 245 or higher. Possible blur / low detail: four-neighbor Laplacian variance below 60.
- These fixed thresholds are review heuristics, not calibrated image-quality or driving-safety criteria. Smooth scenes can look low-detail without being blurred; bright or dark scenes can be intentional. Brightness is not physical luminance.
- Each interval covers consecutive flagged sample bins, clamped to clip duration. It does not assert an exact event onset or end between sampled frames.
- Missing decoded frames are displayed as unavailable and prevent export of an incomplete report. Cancellation likewise produces no report.
- The demo is generated from original pixel code. It is not recorded driving footage or a research benchmark.

## Privacy and reports

Video processing happens through the browser's local media and Canvas APIs. The application has no upload endpoint, analytics, external assets, cloud API, or persistence. Choosing a clip does not upload it. Reloading clears the current analysis.

Reports include the selected file's name, dimensions, duration, sample times, metrics, flags, grouped intervals, analysis resolution, thresholds, and limitations. They omit video bytes and frame images. A filename may contain personal information; inspect reports before sharing them. Synthetic reports are explicitly labeled. CSV values are quoted and formula-leading filenames are escaped.

## Verify

```sh
node --test tests/analyze.test.mjs tests/export.test.mjs tests/video.test.mjs
```

The dependency-free Node tests cover dark/bright/detail measurements, threshold boundaries, generated-scene behavior, segment grouping across gaps and errors, report serialization, CSV escaping, size/duration rejection, cancellation, media errors, and event-listener cleanup.

To exercise an actual video decoder without a private recording, open **http://127.0.0.1:8791/tests/browser-fixture.html**. Record and download the generated six-second WebM, then select that file through the main app's file chooser. This separate test helper uses MediaRecorder; it is not part of the product UI. Also try a deliberately invalid video, cancel an analysis, and replace its source with the demo.

## Source guide

- `src/app.js`: UI state, file selection, progress, inspection, downloads.
- `src/video.js`: limits, media events, sequential local-video sampling.
- `src/analyze.js`: pure measurements, threshold flags, interval grouping.
- `src/demo.js`: deterministic generated frames.
- `src/export.js`: report schema and CSV/JSON serialization.
- `index.html` and `styles.css`: accessible page structure and responsive layout.
- `serve.mjs`: dependency-free loopback static server.
- `devpost/app-map.html`: an offline reference route through the working code.

## Project status

The learner approved the core concept, browser-only architecture, and build sequence on 2026-10-17. The approved [scope](devpost/scope.md), [requirements](devpost/prd.md), [specification](devpost/spec.md), and [checklist](devpost/checklist.md) record the boundaries and actual verification state.

Implementation and mechanical tests are distinct from the learner's hands-on review. Learner feedback, the learning wrap-up, a public repository, the required short demo video, and the learner-written contest entry remain pending. No interview, personal reflection, publication, registration, or submission is represented as completed.

Curriculum: https://github.com/challengepost/learn-ai-basics

Original source is available under the [MIT license](LICENSE).
