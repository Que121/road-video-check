---
doc: scope
status: approved
---

# Road video quality checker — approved scope

**Approval evidence (2026-10-17):** The learner replied “可以” to the displayed local road-video checker concept, browser-only architecture, and build sequence: synthetic demo → local video → report export and tests. This records that real approval, not a completed interview. The title remains a working label; the learner will supply the public submission name.

One line: a local tool that points a researcher to parts of a road-camera recording worth reviewing for poor visual quality.

## The Unique Kernel

Move from a whole video to a short, inspectable list of suspicious moments, with measurements and original-frame previews explaining each flag.

## Who It's For

Intended user: a researcher reviewing short road-camera recordings before experiments. The approved tool supports frame inspection rather than deciding whether footage is suitable for a model.

## The Core Loop

Open a local clip or the synthetic demo, analyze sampled frames, select flagged intervals to inspect, and download measurements for further review.

## Inspiration & Identity

A light, compact research utility, with the video and measurements taking priority over decoration. This is the implementation's design default, not a separately established learner preference; it remains subject to hands-on feedback.

## Why This Matters to the Learner

The learner's existing work concerns end-to-end driving and degraded visual inputs. This makes the proposal relevant, but the learner's personal reason for choosing it has not been established.

## What "Working" Looks Like

A synthetic road scene with distinct clear, dark, washed-out, and blurred intervals produces explainable measurements and review flags. A user-owned short video follows the same analysis path. Selecting a timeline item displays the corresponding sampled frame, and the user can export a CSV and JSON report.

## The POC Boundary

- One browser-supported local video at a time, up to two minutes and 200 MiB.
- One sampled frame per second; a displayed notice explains that brief events between samples can be missed.
- Three transparent measurements: luminance, bright-pixel fraction, and image-detail score.
- Timeline, sampled-frame previews, flagged intervals, and CSV/JSON export.
- A generated synthetic example clearly labeled as such throughout the interface and reports.
- No upload, accounts, external API keys, or saved video library.

## Later

Camera-specific thresholds, denser sampling, rain or occlusion models, multiple clips, and integration with dataset tooling could be considered after the small loop is useful.

## Explicitly Cut

- Driving-model scoring or safety certification: simple image measurements cannot support those claims.
- Learned quality models and model training: unnecessary to test whether inspectable quality flags help.
- Automatic repair, enhancement, or removal of frames: the tool only identifies candidates for human review.
- Research benchmarks, private experiments, and unpublished project code: this should be a separate small project with synthetic or user-owned input.
- Public deployment: a local recording is sufficient to demonstrate this proof of concept.
