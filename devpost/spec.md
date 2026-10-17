---
doc: spec
status: approved
---

# Road Video Check — technical specification

Architecture approval: on 2026-10-17 the learner replied “可以” to the proposed local browser-only checker and synthetic demo → local video → reports/test sequence. Plain JavaScript and Canvas implement that choice. No user interview, final review, or learning outcome has been invented.

## How This Works, In Plain Language

The browser opens a clip on the user's computer, samples a small frame every second, measures brightness and detail, and links unusual measurements back to the video. Nothing needs to be uploaded. A generated demo makes the behavior inspectable before choosing a personal video.

## The Core Journey Through the System

Source selection → metadata validation → sequential frame sampling → shared pixel-measurement functions → threshold flags and grouped sampling intervals → timeline/frame inspection → downloadable report.

PRD ref: `prd.md > The Core Journey`.

## Stack

Plain HTML, CSS, and JavaScript modules, with no third-party runtime dependencies or package installation. Browser `<video>` decoding, Canvas 2D for downsampling/pixel access, and Blob downloads for reports. A small Node loopback static server supports local development.

This keeps video processing local, but codec support varies by browser. It provides transparent heuristic measurements rather than learned predictions; no driving-safety judgment is implied.

Reference documentation to verify during implementation:
- Video: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video
- Canvas: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- Blob: https://developer.mozilla.org/en-US/docs/Web/API/Blob

## Where It Runs and How Someone Tries It

Command: `node serve.mjs` from this project folder; open `http://127.0.0.1:8791/` in a current desktop browser. Node 20 or newer; no dependencies to install and no API key. The built-in server binds only to loopback. An npm executable is not required.

The Node server has been run locally. A short demo video and a public GitHub repository are required for the event. The user has now requested contest submission, including preparation of those delivery materials. Their public URLs and successful submission must be recorded after verification; this document does not claim they already exist. Deployment of a hosted application is optional and is not required for this local tool.

## Look and Feel

The implemented layout uses ordinary system typography, clear focus states, native file selection, and a responsive grid, following `prd.md > Look and Feel`. Labels and an adjacent legend explain colored timeline marks. Initial user feedback prompted a compact workbench and more visible sample selection; a separate hands-on review of the revised design has not been recorded.

## Components

### Source and Sampling

Validate one file of at most 200 MiB and 120 seconds. Use a local object URL, await metadata, seek sequentially with a timeout, then draw each frame to a canvas of width at most 320 pixels while preserving aspect ratio. Sampling times are `0, 1, 2, ...` strictly below duration. Revoke URLs on replacement and cleanup. Each run has an AbortController; discard results from a canceled/replaced source.

PRD ref: `prd.md > Choose and Analyze`.

### Measurement and Flags

Pure functions accept RGBA pixels and dimensions. Convert pixels to grayscale using `0.2126 R + 0.7152 G + 0.0722 B` on the ordinary 0–255 encoded channel values; describe this as an image brightness heuristic, not physical luminance.

Initial defaults for experimentation:
- Dark: mean grayscale value below 35.
- Washed out: fraction of grayscale pixels at or above 245 exceeds 0.35.
- Low detail / possible blur: variance of the four-neighbor discrete Laplacian below 60, excluding the image border.

These are unvalidated heuristic thresholds. They depend on resizing, scene texture, and camera exposure; preserve dimensions and thresholds in reports. No combined safety or quality percentage is computed. Determine actual demo behavior using tests rather than hardcoding its flags.

PRD ref: `prd.md > Explainable Review Flags`.

### Timeline and Segment Grouping

Group consecutive flagged samples by flag and sampling-bin adjacency. Each bin starts at its sample timestamp and ends one sampling interval later, clamped to video duration. Never bridge an error or missing sample. Boundaries have one-second resolution.

PRD ref: `prd.md > Timeline and Intervals`.

### Synthetic Source

Generate a deterministic small road-like pixel scene and draw it in Canvas; derive dark, overexposed, and blurred variants from its pixel data. The same measurement module processes those frames. Preserve `source.kind: synthetic` in JSON and `sourceKind: synthetic` in CSV, plus a human-readable demo label. No imported photographs, unpublished research, or third-party dataset required.

PRD ref: `prd.md > Synthetic Demo`.

### Report Export

Create CSV and JSON from completed measurement state. Quote CSV fields and guard formula-leading filenames. Store only numeric measurements/flags/metadata, not raw video or frame arrays. Name reports with a UTC ISO timestamp and source label. Generated reports go to the browser's download destination; no server upload.

PRD ref: `prd.md > Download Reports`.

## Data Model

Report fields assembled from the in-memory UI state:
- `source`: kind, display name, duration, dimensions.
- `config`: sampling interval, analysis width/height, named thresholds, heuristic version.
- `samples[]`: index, time, success/error, brightness, bright fraction, detail variance, flags.
- `segments[]`: flag, first/last sample indices, start, end, sample count.

The UI separately tracks empty/loading/analyzing/canceled/complete/error behavior, the active abort controller, and temporary frame previews.

No storage across reloads. Canvas thumbnails may be kept temporarily for inspection, but never embedded in exported reports.

## File Structure

Application structure:

```text
index.html                 # source controls, preview, timeline, interval list
styles.css                 # light responsive layout
src/app.js                 # source lifecycle and UI state
src/analyze.js             # pure measurements, flags, and segment grouping
src/demo.js                # deterministic synthetic frames
src/export.js              # report schemas and serialization
src/video.js               # video validation, seeking, and sampling
serve.mjs                  # dependency-free local static server
tests/analyze.test.mjs     # meaningful measurement/segmentation cases
tests/video.test.mjs       # limits, media errors, cancellation, event cleanup
tests/export.test.mjs      # schema, payload exclusion, CSV escaping
tests/browser-fixture.html # generated video for actual decoder checks
README.md                  # factual setup and usage
LICENSE                    # MIT license for original project source
devpost/                   # planning and review record
```

## External Services and Dependencies

No external service, paid API, or credential is used at runtime. Native browser decoding is checked with an actual generated short WebM selected through the file chooser; pure-analysis, export, and lifecycle modules are checked under Node's built-in test runner. Browser verification evidence belongs in the checklist.

## Important Failure Modes

- Unsupported codec or failed seek → actionable error and incomplete status, never a completed report.
- Smooth or nighttime scenes trigger an inappropriate heuristic → original-frame inspection and explicit threshold/limitation text; no automated rejection of footage.
- Replacement/cancellation while a seek is active → invalidate the old run; no mixed-source report.

## What Was Simplified and Why

Within the approved concept, one-second sampling and 320-pixel analysis width bound the work; three inspectable heuristics demonstrate the review loop; a local single page avoids upload infrastructure; a synthetic source permits a demo without private footage. These remain implementation defaults, not claims of calibrated performance.

## Decisions and Open Issues

- The browser-only architecture and core sequence were approved in the exchange recorded above; small implementation details follow from that approval.
- No learner uncertainty or learning outcome has yet been established; do not invent one.
- Browser seeking, codec support, and the behavior of heuristic thresholds require early verification.
- Original project source uses MIT as part of the authorized implementation. No private research has been imported. Public publication remains unperformed.
