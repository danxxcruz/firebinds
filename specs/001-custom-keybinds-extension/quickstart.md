# Quickstart: Manual Validation

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `manifest.json` from the repository root.
4. Open a normal webpage with links or buttons.
5. Click the Firebinds toolbar icon.
6. Use **Add keybind**, select an element on the page, then complete the keybind
   in the popup.
7. Reload the page and press the saved key combination.
8. Create a global **Text pattern** binding such as `Add New*` and confirm it
   works on another normal webpage with a matching control.
9. Create a second profile, switch profiles, and confirm only the active profile's
   bindings appear and trigger.

Expected result: the target element activates, and its key indicator remains
visible unless indicators are hidden from the popup.
