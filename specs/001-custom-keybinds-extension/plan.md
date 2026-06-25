# Implementation Plan: Custom Keybinds Extension

**Branch**: `001-custom-keybinds-extension` | **Date**: 2026-06-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-custom-keybinds-extension/spec.md`

## Summary

Build a simple Firefox-only WebExtension for popup-first custom webpage keybinds.
The popup is the only configuration surface. The content script only supports page
selection, visual indicators, key capture on the page, and target activation.

## Technical Context

**Language/Version**: Vanilla JavaScript, HTML, and CSS for Firefox WebExtensions

**Primary Dependencies**: Firefox WebExtension APIs only; no framework or build step

**Storage**: `browser.storage.local`

**Testing**: Manual Firefox extension validation plus syntax checks

**Target Platform**: Firefox desktop

**Project Type**: Browser extension

**Performance Goals**: Indicators and key handling should feel immediate on pages
with up to 10 bindings.

**Constraints**: All create/edit/delete/configuration actions must happen in the
extension popup. Page UI is limited to picker highlight, indicators, and passive
feedback.

**Scale/Scope**: Local-only v1 with exact-page and site-level binding scopes.

## Constitution Check

### Simplicity

- Pass: vanilla WebExtension files, no bundler, no framework, no account or sync.
- Pass: popup-first UX keeps configuration in one place.

### Robustness

- Pass: plan covers restricted pages, missing targets, duplicate keybinds, reserved
  combos, editable-field conflicts, and stale selectors.

### Pragmatism

- Pass: uses standard Firefox WebExtension APIs and local storage.

### Proportional Validation

- Pass: manual validation is appropriate for browser UI and page interaction v1,
  with pure helpers kept simple enough for syntax checks.

### Operational Clarity

- Pass: README and manual validation guide document loading and expected behavior.

## Project Structure

```text
manifest.json
popup/
├── popup.html
├── popup.css
└── popup.js
src/
├── background.js
├── content.css
├── content.js
├── key-combo.js
├── messages.js
├── storage.js
└── targeting.js
icons/
└── icon.svg
tests/
└── manual.md
```

**Structure Decision**: Keep a flat extension layout so Firefox can load it
directly as a temporary add-on without a build step.

## Complexity Tracking

No constitutional violations.
