# Tasks: Custom Keybinds Extension

**Input**: Design documents from `specs/001-custom-keybinds-extension/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/messages.md, quickstart.md

## Phase 1: Setup

- [X] T001 Create extension project structure: `manifest.json`, `popup/`, `src/`, `icons/`, `tests/`
- [X] T002 Configure Manifest V3 extension shell in `manifest.json`
- [X] T003 [P] Create toolbar icon in `icons/icon.svg`
- [X] T004 [P] Create manual validation guide in `tests/manual.md`

## Phase 2: Foundational

- [X] T005 Define runtime message names in `src/messages.js`
- [X] T006 Implement local storage helpers in `src/storage.js`
- [X] T007 Implement key combination normalization and validation in `src/key-combo.js`
- [X] T008 Implement target descriptor and matching helpers in `src/targeting.js`
- [X] T009 Implement background coordination in `src/background.js`
- [X] T010 Create popup base layout in `popup/popup.html`
- [X] T011 Create popup styling in `popup/popup.css`
- [X] T012 Wire popup initialization in `popup/popup.js`
- [X] T013 Wire content script startup in `src/content.js`

## Phase 3: User Story 1 - Bind a Page Element

- [X] T014 [US1] Add create-binding flow in `popup/popup.html`
- [X] T015 [US1] Implement popup key capture and save state in `popup/popup.js`
- [X] T016 [US1] Implement picker hover, click, and cancel behavior in `src/content.js`
- [X] T017 [US1] Build selected element descriptors in `src/targeting.js`
- [X] T018 [US1] Store pending picker result and popup fallback in `src/background.js`
- [X] T019 [US1] Save new keybinds in `src/storage.js`
- [X] T020 [US1] Render indicator on selected element in `src/content.js`
- [X] T021 [US1] Document create/cancel/save validation in `tests/manual.md`

## Phase 4: User Story 2 - Use Saved Keybinds

- [X] T022 [US2] Add safe keydown handling in `src/content.js`
- [X] T023 [US2] Match key combinations against bindings in `src/key-combo.js`
- [X] T024 [US2] Activate matched targets in `src/content.js`
- [X] T025 [US2] Handle missing targets in `src/content.js`
- [X] T026 [US2] Persist missing-target status in `src/storage.js`
- [X] T027 [US2] Document trigger validation in `tests/manual.md`

## Phase 5: User Story 3 - See Bound Elements

- [X] T028 [US3] Implement indicator rendering and removal in `src/content.js`
- [X] T029 [US3] Add indicator visibility toggle in `popup/popup.html`
- [X] T030 [US3] Wire indicator visibility state in `popup/popup.js`
- [X] T031 [US3] Refresh indicators on DOM changes in `src/content.js`
- [X] T032 [US3] Document indicator validation in `tests/manual.md`

## Phase 6: User Story 4 - Manage Existing Bindings

- [X] T033 [US4] Render current binding list in `popup/popup.js`
- [X] T034 [US4] Add edit behavior in `popup/popup.js`
- [X] T035 [US4] Add enable/disable behavior in `popup/popup.js`
- [X] T036 [US4] Add delete behavior in `popup/popup.js`
- [X] T037 [US4] Add reselect behavior in `popup/popup.js`
- [X] T038 [US4] Document management validation in `tests/manual.md`

## Phase 7: User Story 5 - Resolve Keybind Problems

- [X] T039 [US5] Define reserved-key rules in `src/key-combo.js`
- [X] T040 [US5] Add popup conflict resolution in `popup/popup.js`
- [X] T041 [US5] Detect restricted pages in `src/background.js`
- [X] T042 [US5] Mark ambiguous target matches in `src/targeting.js`
- [X] T043 [US5] Preserve bindings on failures in `src/storage.js`
- [X] T044 [US5] Document problem validation in `tests/manual.md`

## Final Phase: Polish

- [X] T045 [P] Add usage notes to `README.md`
- [X] T046 [P] Add temporary extension instructions to `tests/manual.md`
- [X] T047 Review popup copy and feedback in `popup/popup.js`
- [X] T048 Run static validation checks for JavaScript files
- [X] T049 Confirm configuration actions are only in popup UI
