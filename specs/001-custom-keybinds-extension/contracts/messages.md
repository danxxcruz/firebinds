# Runtime Message Contract

The popup, background script, and content script communicate with plain runtime
messages. Every request includes a `type` string.

## Popup to Background

- `GET_ACTIVE_PAGE_STATE`: Load current tab state.
- `START_PICKER`: Begin selecting an element in the current tab.
- `CANCEL_PICKER`: Cancel active selection.
- `SAVE_BINDING`: Create or replace a keybind.
- `UPDATE_BINDING`: Change key, scope, status, or target.
- `DELETE_BINDING`: Remove one keybind.
- `TOGGLE_BINDING`: Enable or disable one keybind.
- `SET_INDICATORS_VISIBLE`: Show or hide indicators for current page scope.
- `CLEAR_PENDING_PICK`: Discard selected target waiting for confirmation.
- `TEST_TARGET`: Ask the current page whether a target is ready, missing, or ambiguous.
- `LIST_PROFILES`, `SAVE_PROFILE`, `DELETE_PROFILE`, `DUPLICATE_PROFILE`, `SET_ACTIVE_PROFILE`: Manage popup profiles.
- `DUPLICATE_BINDING`: Copy an existing binding in the active profile.

## Content to Background

- `GET_CONTENT_STATE`: Load matching bindings for the current page.
- `PICKER_RESULT`: Send selected target descriptor to the background script.
- `PICKER_CANCELLED`: Notify that picker mode ended without a target.
- `BINDING_STATUS`: Persist `ready`, `missing`, or `ambiguous` status.

## Background to Content

- `PING`: Check whether the content script is present.
- `START_PICKER`: Begin hover/click selection.
- `APPLY_STATE`: Replace content-side binding and indicator state.
- `CHECK_TARGET`: Return target match status without activating it.
