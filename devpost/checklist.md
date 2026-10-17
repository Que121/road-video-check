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

Mechanical checkpoint on 2026-10-17: 20/20 Node tests passed with `node --test tests/analyze.test.mjs tests/export.test.mjs tests/video.test.mjs`. Integrated implementation commit: `1fa2b61`. Browser evidence above is agent verification, not learner feedback. No public push or deployment has occurred.

- [ ] Early usable behavior explored after slice 1, with actual learner feedback recorded.
- [ ] Final kick-the-tires exploration and feedback completed.

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship.

The user reported that clicks appeared to have no effect and that the initial page looked unattractive. A revised workbench and clearer selection feedback were implemented in response. A separate hands-on review of that revision has not been recorded. The later request to submit the project authorizes contest preparation; it does not establish that those hands-on activities took place.

## Contest Preparation

- The user requested submission to Build With AI: Basics. Required public source publication and a demonstration video are within that request.
- The project uses the name Road Video Check. Application copy may be prepared with assistance, using real project behavior and development records; personal reflections and completed learning activities must not be invented.
- The public repository URL, publicly accessible YouTube/Vimeo demo URL, final Devpost form, and successful submission receipt still need verification and recording.
- Optional curriculum checkpoints above remain an honest activity record. They are not a claim of completed learning or a substitute for the contest's actual submission requirements.

## Revised Workbench Verification

- The layout now has a compact masthead, a source rail, a central frame viewer with its timeline directly below, and a measurement inspector. All 32 original DOM IDs were preserved; every application binding resolves.
- Interval and timeline selections visibly remain active. User-initiated selection reveals an offscreen preview and gives a brief selection cue. The sample heading announces changes; same-file reselection is supported; demo errors appear in the status area.
- Agent desktop browser QA passed: the demo produced 16 samples; selecting the Dark interval displayed 00:04 with brightness 15.1, bright pixels 0%, and detail 32.4, with matching active interval and timeline states.
- The generated WebM was imported through the actual chooser and analyzed into seven samples with the expected flags and correct time-zero frame. Browser console checks reported no warnings or errors.
- All 20 Node tests passed after the interaction changes. Syntax, DOM-binding, and whitespace checks passed. The root agent saved a desktop QA screenshot outside this repository at `outputs/build_with_ai_20261017/qa/road-video-check-redesign.png` in the shared workspace.
- Mobile CSS is implemented but has not been verified in a mobile viewport. Browser cancellation, revised-design approval, final hands-on review, and learning wrap-up remain pending. This is local verification only; no public push, deployment, or contest submission occurred.

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
