---
doc: checklist
status: approved
---

# Build Checklist

The learner approved the displayed concept, browser-only architecture, and this sequence with “可以” on 2026-10-17. Implementation is authorized. Hands-on learner review and the learning wrap-up remain pending until they actually occur.

Build mode: fast implementation, following the learner's request for delegated implementation and concise progress. This does not waive their final hands-on review.

## Slices

The slice checkboxes below track implementation and mechanical verification only. They do not mark learner checkpoints complete.

- [x] **1. Inspect explainable flags on generated frames**
  Becomes usable: A local page with a synthetic road scene, measured clear/dark/washed-out/blurred frames, timeline selection, and visible thresholds.
  Why now: Demonstrates the actual measurement-to-review loop before adding file decoding.
  PRD ref: `prd.md > Explainable Review Flags`, `prd.md > Synthetic Demo`, `prd.md > Timeline and Intervals`
  Spec ref: `spec.md > Measurement and Flags`, `spec.md > Synthetic Source`, `spec.md > Timeline and Segment Grouping`
  Build: Scaffold the local page and pure analysis module; generate labeled demo frames; render measurements and linked samples.
  Verify (mechanical): Compare a sharp textured scene to its blurred counterpart; check uniform dark/bright images, finite metrics, and segment grouping around gaps. Verify computed flags, not prerecorded output.
  Learner check: Select each demo interval and judge whether the explanation and frame preview make sense.
  Evidence: Node tests cover pixel measurements, threshold boundaries, generated variants, and gap handling. The agent browser check observed 16 measured demo samples, 12 flagged samples, three intervals, and linked frame selection.
  Commit: included in the integrated local implementation checkpoint; no separate early commit was made.

- [x] **2. Analyze a short local clip through the same review loop**
  Becomes usable: File selection, progress, cancellation, frame sampling, and linked original-frame inspection.
  Why now: Tests the main integration risk, browser decoding and seeking, while reusing a visible working analysis loop.
  PRD ref: `prd.md > Choose and Analyze`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Source and Sampling`, `spec.md > Important Failure Modes`
  Build: Validate file metadata, process sampled frames sequentially, support cancellation and source replacement, and show useful errors.
  Verify (mechanical): Use an actually decoded short clip; check sample timestamps/count, unsupported input, cancellation, and replacing the source during a run. Inspect network activity for absence of clip upload.
  Learner check: Open a user-owned clip, compare a flagged sample with the original, and cancel a second run.
  Evidence: an actual generated 6.02-second WebM was selected through the browser's file chooser and decoded into seven samples. The final regression check observed clear frames at 0–1 s, dark at 2–3 s, overexposed at 4 s, and low detail at 5–6 s, grouped into three intervals. The original video automatically aligned to 0 s after completion and to 4 s after selecting the overexposure interval. An invalid video produced a useful decode error and the demo still worked afterward. Node tests cover cancellation/listener cleanup and exact size/duration boundaries; a browser cancellation interaction remains unverified.
  Commit: included in the integrated local implementation checkpoint; no separate early commit was made.

- [x] **3. Export measurements and complete the reviewable proof of concept**
  Becomes usable: CSV/JSON reports preserve measured values, thresholds, intervals, sampling limits, and synthetic-source labeling.
  Why now: Completes the core journey after source behavior is known to work.
  PRD ref: `prd.md > Download Reports`, `prd.md > The Core Journey`
  Spec ref: `spec.md > Report Export`, `spec.md > Data Model`
  Build: Add safe serialization and downloads; finalize keyboard navigation, responsive layout, factual README, and original-source MIT license.
  Verify (mechanical): Parse exported JSON and CSV; compare values with UI state; check quoted/formula-leading names, synthetic labeling, and absence of raw video data. Run the targeted tests and basic viewport checks.
  Learner check: Download both reports, inspect their content, and run the whole short-clip workflow.
  Evidence: Node tests verify serialization, raw-payload exclusion, and CSV escaping. The agent browser downloaded and parsed both demo reports: 16 samples, three segments, thresholds/resolution preserved, and no image/video payload. Desktop layout was visually checked; mobile layout has only static CSS review so far.
  Additional evidence: the decoded local-video JSON also downloaded and matched seven samples and three intervals; browser console checks reported no warnings or errors.
  Commit: included in the integrated local implementation checkpoint; no separate early commit was made.

## Hands-on Checkpoints

- [ ] Early usable behavior explored after slice 1, with actual learner feedback recorded.
- [ ] Final kick-the-tires exploration and feedback completed.

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship.

## Code Tour and App Map

- [ ] Learning activity complete — an actual user-selected practice or code route recorded.
- [ ] Optional edit and transfer reflection addressed without inventing a response.
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown.

The map has been generated; its reference paths and anchors are checked separately. Showing it to the learner and any actual walkthrough remain pending.

Activity and evidence: learner activity not started. The agent prepared a reference map from the actual implementation.
Route and stops: `src/app.js` (`chooseFile`, `analyzeLocal`) → `src/video.js` (`sampleVideo`) and `src/analyze.js` (`analyzeFrame`, `flagsFor`) → `src/app.js` (`showSample`) and `src/export.js` (`createReport`). This route has not been toured with the learner.
Edit outcome: not started.
Reflection: not requested or supplied.
Activity mode: not established.

## Revisions

- The shell has Node but no `python` or `npm` executable. A dependency-free Node static server and direct `node --test` command replace those tool assumptions without changing the browser-only architecture or product behavior.
- Actual video testing exposed an initially black sampled frame at time zero despite the source video being clear. Sampling now performs an explicit seek at every timestamp, including zero, and awaits `seeked` before drawing. The timestamp is not shifted or relabeled.
- The generated WebM helper handles both 32-bit and 64-bit duration metadata so a finite-duration decoded clip can be tested without private footage.
