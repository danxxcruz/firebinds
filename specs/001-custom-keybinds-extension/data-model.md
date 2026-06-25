# Data Model: Custom Keybinds Extension

## Keybind

- `id`: Unique binding ID.
- `profileId`: Profile that owns the binding.
- `scopeType`: `page`, `site`, or `global`.
- `scopeValue`: Normalized URL scope.
- `keyCombo`: Normalized key combination string.
- `target`: Element target descriptor.
- `enabled`: Whether the binding can fire.
- `showIndicator`: Whether the binding may render an indicator.
- `allowInEditable`: Whether it can fire while focus is in an editable field.
- `status`: `ready`, `missing`, or `ambiguous`.
- `createdAt` / `updatedAt`: ISO timestamps.

## Profile

- `id`: Unique profile ID.
- `name`: User-facing profile name.
- `createdAt` / `updatedAt`: ISO timestamps.

## Element Target

- `mode`: `picker`, `text`, or `textPattern`.
- `label`: Human-readable element label.
- `selector`: Best known CSS selector.
- `tagName`: Lowercase tag name.
- `textHint`: Trimmed visible text.
- `roleHint`: ARIA role if present.
- `urlAtSelection`: URL where the element was selected.
- `textQuery`: Exact text or wildcard expression for text-based targets.

## Page State

- `pageScope`: Current URL without query/hash.
- `siteScope`: Current origin.
- `bindings`: Bindings matching either scope.
- `profiles`: Available profiles.
- `activeProfile`: Profile currently active in the popup and content scripts.
- `indicatorsVisible`: Whether indicators are shown for the current page scope.
- `pendingPick`: Selected target waiting for popup confirmation.
