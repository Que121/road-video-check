---
doc: prd
status: approved
---

# Road Video Check — product requirements

The user approved the local road-video checker concept, browser-only architecture, and sequence on 2026-10-17. This document records the concrete behavior developed from that scope and the subsequent layout revision. It does not imply a completed learning interview or hands-on review of the revised design.

Source: `scope.md > The Core Loop`, `scope.md > The POC Boundary`.

## The Core Journey

1. Open a local page and choose either a video file or a clearly labeled synthetic demo.
2. See the clip duration and proposed one-frame-per-second sampling before starting.
3. Start analysis; see progress and a working cancel control.
4. Review a timeline and three measurement summaries, with each flag named and explained.
5. Select a sample or interval to see its timestamp, frame, measured values, and relevant thresholds.
6. Download a CSV of sampled frames and a JSON report of thresholds, samples, and intervals.

## Screens and Layout

Single screen: a source rail on the left; a central frame viewer with the sample timeline directly below; a measurement inspector on the right; flagged intervals and export controls below. On a narrow display, these stack vertically. The revised workbench responds to the user's feedback about the initial design and unclear click response.

## Look and Feel

The implemented workbench uses a white/off-white background, dark readable text, restrained colored controls, and amber markers for review flags. Color is supplemented by explicit labels and persistent selected states. The clip, measurements, and timeline fit together on a desktop screen.

## Features and Behavior

### Choose and Analyze

Local files remain in the current browser tab. The page makes no network request containing clip data. Unsupported video formats, files over 200 MiB, or clips over two minutes receive a specific message before analysis. Only one run can be active. Cancellation returns to a usable state and does not present an incomplete result as finished.

### Explainable Review Flags

Every sampled frame shows mean encoded-RGB grayscale brightness, the fraction of very bright pixels, and a detail score. Default thresholds are visible and clearly described as illustrative. "Low detail / possible blur" avoids claiming that a smooth scene is necessarily blurred. Flags are not safety scores. Unflagged frames are labeled "No heuristic flag," not "safe" or "good quality."

### Timeline and Intervals

Samples are linked to their timestamps and previews. Consecutive flagged samples are grouped by flag. Intervals reflect sampling bins, not a precise measurement of when an artifact starts or ends. Gaps in successful sampling remain visible and cannot silently count as clear frames.

### Synthetic Demo

A deterministic drawn road scene includes separate clear, dark, washed-out, and blurred segments. The demo uses the same pixel-analysis functions as uploaded clips and always displays "Synthetic demo — generated frames." No real vehicle data or performance claim is attached to it.

### Download Reports

CSV includes timestamps, measurements, and flag labels. JSON includes the input type, sampling interval, dimensions, thresholds, samples, grouped intervals, and limitations. A synthetic run is marked as synthetic in both formats. Exports contain measurements only, not images or video. Clip names must be escaped safely in exported text.

## States and Boundaries

- **Empty:** choose a local clip or run the synthetic demo.
- **Loading:** read clip metadata; show a useful error if it cannot be decoded.
- **Analyzing:** show progress and allow cancellation; source changes cancel the old run.
- **Complete:** show measured samples and enable exports.
- **Decode failure:** identify the failed sample and explain that analysis is incomplete.
- **Reloaded:** previous video and results are gone; there is no persistence.

## Product Decisions

Confirmed: local processing without upload; dark, overexposed, and possible-blur flags; original-frame inspection; CSV/JSON export; synthetic demo first. The detailed layout and limits are implementation defaults within that approved small scope.

## What We're Building

One inspectable path from local clip or synthetic source to sampled measurements, timestamped review flags, and exports. This follows `scope.md > What "Working" Looks Like`.

## Deferred From the POC

Dataset management, learned artifact detection, configurable camera profiles, video enhancement, hosted application service, and bulk processing remain outside the boundary. The public source repository and demonstration video required by the contest are authorized delivery materials.

## Open Questions

- During hands-on review: is the single-page light layout appropriate?
- During hands-on review: are the explanations and short-clip limits useful in practice?
- Before final review: which user-owned clip can be used for the hands-on check without publishing private footage?
