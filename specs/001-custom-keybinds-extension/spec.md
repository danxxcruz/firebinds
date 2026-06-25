# Feature Specification: Custom Keybinds Extension

**Feature Branch**: `001-custom-keybinds-extension`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Build a firefox extension that can help me set up custom keybinds for webpages for easier navigation and interaction. It should have an element picker like Ublock Origin zapper and place a little indicator in the webpage on the element it applied a keybind to"

## Constitution Alignment *(mandatory)*

**Scope Boundary**: This feature includes a Firefox extension experience for creating,
editing, viewing, using, and removing custom keyboard shortcuts tied to elements on
webpages. It includes an on-page element picker, per-site saved bindings, conflict
feedback, and visual indicators for bound elements. It excludes cloud sync, account
sharing, multi-browser support, and advanced automation sequences beyond a single
interaction target.

**Simplest Viable Approach**: A user can open the extension on a webpage, enter
picker mode, select one page element, assign one key combination, see an indicator
on that element, and later press the key combination to activate the chosen element.

**Robustness Expectations**: The feature must handle missing or changed elements,
invalid or duplicate key combinations, pages where selection is unavailable,
restricted browser pages, dynamic page changes, and conflicts with webpage or browser
shortcuts by giving clear feedback and preserving existing saved bindings.

**Validation Evidence**: Completion requires scenario checks for creating,
triggering, editing, and deleting a binding; conflict and invalid-key checks; and
checks that the indicator appears, updates, and disappears correctly across page
reloads and changed page content.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bind a Page Element (Priority: P1)

As a user navigating a webpage repeatedly, I want to visually select an element and
assign a custom keybind to it so I can activate it without reaching for the mouse.

**Why this priority**: Creating a reliable binding is the core value of the
extension. Without this flow, later management and navigation features have nothing
to operate on.

**Independent Test**: On a supported webpage, enter picker mode, select a visible
interactive element, assign an unused key combination, and confirm the selected
element shows a binding indicator.

**Acceptance Scenarios**:

1. **Given** the user is on a supported webpage, **When** they open picker mode and hover elements, **Then** the page highlights the current candidate without activating it.
2. **Given** the user has selected an element, **When** they enter a valid unused key combination and save, **Then** the keybind is stored for that page scope and an indicator appears on the selected element.
3. **Given** the user cancels picker mode before saving, **When** they return to the page, **Then** no keybind or indicator is added.

---

### User Story 2 - Use Saved Keybinds (Priority: P1)

As a user, I want pressing my saved key combination on a matching webpage to activate
the bound element so that navigation and interaction are faster.

**Why this priority**: The extension must turn saved bindings into real page
interaction; creation alone does not improve navigation.

**Independent Test**: Create a binding for a button or link, reload the page, press
the assigned key combination, and verify the same element is activated.

**Acceptance Scenarios**:

1. **Given** a keybind exists for the current page and its target element is present, **When** the user presses the assigned key combination, **Then** the target element is activated.
2. **Given** a keybind target is temporarily missing, **When** the user presses the key combination, **Then** the extension shows non-disruptive feedback and leaves the saved binding unchanged.
3. **Given** the user is typing in an editable field, **When** a saved key combination would conflict with normal text entry, **Then** the extension avoids disrupting text input unless the binding was explicitly allowed for editable fields.

---

### User Story 3 - See Bound Elements on the Page (Priority: P2)

As a user, I want small indicators on elements that have custom keybinds so that I
can understand which page controls are enhanced and which key activates them.

**Why this priority**: Indicators make the feature discoverable after setup and help
users trust that bindings are attached to the intended elements.

**Independent Test**: Create multiple bindings on a page and verify each bound
element has a readable, non-blocking indicator that persists after reload.

**Acceptance Scenarios**:

1. **Given** a page has saved bindings, **When** the page loads, **Then** each matched element receives a small indicator showing the assigned key combination.
2. **Given** an indicator would cover important page content, **When** it is displayed, **Then** it is positioned to minimize obstruction while remaining associated with its element.
3. **Given** a binding is removed or disabled, **When** the page updates, **Then** the related indicator disappears.

---

### User Story 4 - Manage Existing Bindings (Priority: P2)

As a user, I want to review, edit, disable, and remove my saved keybinds for the
current webpage so that I can keep shortcuts accurate as pages change.

**Why this priority**: Webpages change over time, and users need a simple way to fix
or remove stale shortcuts without resetting everything.

**Independent Test**: Open the extension on a page with saved bindings, edit one
key combination, disable another, remove a third, and verify page indicators and
shortcut behavior update accordingly.

**Acceptance Scenarios**:

1. **Given** saved bindings exist for the current page, **When** the user opens the extension controls, **Then** they can see the bound element label, key combination, status, and available actions.
2. **Given** the user edits a key combination, **When** the new combination is valid, **Then** the binding updates and the indicator reflects the new key.
3. **Given** the user deletes a binding, **When** they confirm deletion, **Then** the shortcut no longer triggers and the element indicator is removed.

---

### User Story 5 - Resolve Keybind Problems (Priority: P3)

As a user, I want clear feedback when a shortcut is invalid, duplicated, or cannot
be applied so that I can fix the issue without guessing.

**Why this priority**: Conflict handling improves reliability and prevents the
extension from making pages harder to use.

**Independent Test**: Attempt to save duplicate, reserved, and incomplete key
combinations and verify each case provides clear feedback without corrupting
existing bindings.

**Acceptance Scenarios**:

1. **Given** the user enters a key combination already used on the same page scope, **When** they try to save it, **Then** the extension explains the conflict and offers to replace or choose another combination.
2. **Given** a key combination is reserved or unsafe to intercept, **When** the user attempts to save it, **Then** the extension rejects it with a concise explanation.
3. **Given** the selected element cannot be reliably identified after page changes, **When** the user reviews bindings, **Then** the binding is marked as needing re-selection.

### Edge Cases

- The user tries to run the extension on browser-managed pages or restricted pages.
- The selected target element is removed, duplicated, hidden, disabled, or loaded late.
- The selected element is inside a nested frame, overlay, modal, or scrollable region.
- The user presses a keybind while focused on an input, text area, editable document, or webpage shortcut area.
- A webpage already uses the same key combination for its own behavior.
- Multiple saved bindings match visually similar elements on the same page.
- Page layout changes cause an indicator to overlap important content or detach from its element.
- The user changes a binding while the bound page is open in multiple tabs.
- Saved binding data is unavailable, partially corrupted, or cannot be read.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The extension MUST provide an on-page picker mode that lets users hover, highlight, select, and cancel selection of webpage elements without triggering those elements.
- **FR-002**: The extension MUST allow users to assign a custom key combination to a selected element for the current webpage scope.
- **FR-003**: The extension MUST save keybinds with enough page and element information to reapply them after the page reloads.
- **FR-004**: The extension MUST display a small indicator on each matched bound element showing the assigned key combination.
- **FR-005**: The extension MUST activate the bound element when the user presses the assigned key combination on a matching webpage.
- **FR-006**: The extension MUST allow users to view saved bindings for the current page, including key combination, target description, and status.
- **FR-007**: The extension MUST allow users to edit, disable, reselect, and delete saved bindings.
- **FR-008**: The extension MUST detect duplicate key combinations within the same page scope before saving and require the user to resolve the conflict.
- **FR-009**: The extension MUST reject incomplete, unsupported, or reserved key combinations with actionable feedback.
- **FR-010**: The extension MUST avoid interfering with normal typing in editable fields unless the user has explicitly allowed a binding to work there.
- **FR-011**: The extension MUST show clear feedback when a saved binding target cannot be found or activated.
- **FR-012**: The extension MUST preserve existing bindings when a new binding fails to save, a target cannot be found, or a page is restricted.
- **FR-013**: The extension MUST support multiple bindings on the same webpage when their key combinations are distinct.
- **FR-014**: The extension MUST provide a way to temporarily hide or show on-page indicators without deleting bindings.
- **FR-015**: The extension MUST keep indicator placement visually associated with the target element while minimizing obstruction of page content.
- **FR-016**: The extension MUST communicate when the current page does not permit picking, binding, or activation.

### Key Entities *(include if feature involves data)*

- **Keybind**: A saved shortcut definition containing the key combination, page
  scope, target element reference, action status, editable-field behavior, and
  enabled or disabled state.
- **Element Target**: The selected webpage element as understood by the extension,
  including a human-readable label and matching information used to find it again.
- **Page Scope**: The webpage or site boundary where a keybind applies, such as the
  current page pattern or site-level grouping chosen by the user.
- **Indicator**: The visible marker attached to a matched element, showing the
  assigned key combination and reflecting enabled, disabled, or missing-target
  status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can create a working keybind for a visible page element in under 45 seconds after opening the extension.
- **SC-002**: At least 95% of saved bindings on unchanged pages activate the intended element after a page reload.
- **SC-003**: Users can identify all bound elements on a page with up to 10 bindings without opening extension settings.
- **SC-004**: Invalid, duplicate, or reserved key combinations are blocked before saving in 100% of validation attempts.
- **SC-005**: When a target element is missing, users receive understandable feedback within 2 seconds of pressing the keybind.
- **SC-006**: Users can edit or remove an existing keybind for the current page in under 30 seconds.
- **SC-007**: Indicators remain readable and do not prevent normal interaction with the bound element in common page layouts.

## Assumptions

- The primary user is a Firefox desktop user who wants faster navigation on pages
  they visit repeatedly.
- Bindings are saved locally on the user's device by default.
- Bindings apply to the current page or site scope selected during setup, with the
  current page as the safest default.
- A keybind activates the selected element's normal primary interaction by default,
  such as clicking a button or link or focusing a form control.
- The first version prioritizes single-key-combination-to-single-element bindings
  over multi-step macros or conditional automation.
- Visual behavior is inspired by familiar element picker experiences, but the
  extension should use its own copy, styling, and behavior.
