# Research: Custom Keybinds Extension

## Decision: Manifest V3 Firefox WebExtension

**Rationale**: Firefox supports Manifest V3 action popups while still allowing
background scripts. This keeps the extension close to current Firefox behavior
without adding compatibility layers.

**Alternatives considered**: Manifest V2 was rejected because it is legacy. A
cross-browser extension was rejected because the spec asks for Firefox and the
constitution favors the smallest useful scope.

## Decision: Popup-first configuration

**Rationale**: The user explicitly required all actions to happen inside the
extension popup. The page only hosts temporary picking affordances and passive
indicators.

**Alternatives considered**: A page overlay toolbar was rejected because it would
be a second configuration surface.

## Decision: Vanilla JavaScript

**Rationale**: The extension is small, and vanilla files can be loaded directly by
Firefox. This avoids build configuration and keeps debugging straightforward.

**Alternatives considered**: TypeScript and framework UI were rejected for v1
because they add ceremony before the behavior needs it.
