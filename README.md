# Firebinds

Firebinds is a simple Firefox extension for creating custom keybinds on webpage
elements. All configuration happens in the extension popup. The webpage only shows
temporary picker highlighting, passive key indicators, and short feedback.

## Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `manifest.json` from this repository.
4. Open a normal webpage and click the Firebinds toolbar icon.

## Use

1. Click **Add keybind** in the popup.
2. Choose a target method:
   - **Pick element** to select a specific element on the page.
   - **Text** to match an interactive element by exact label/text.
   - **Text pattern** to match a wildcard such as `Add New*`.
3. Finish the binding in the popup by choosing page, site, or global scope and
   pressing the desired key combination.
4. Save, reload the page, and press the key combination.

The popup also lets you edit, disable, reselect, delete, and show or hide
indicators for the current page.

## Profiles

Firebinds creates a **Default** profile automatically. Use the profile controls in
the popup to create, rename, duplicate, delete, or switch profiles. Only the active
profile's bindings apply to the current page.

## QoL Tools

- Filter the binding list by key, target, scope, or status.
- Duplicate a binding, then assign the copy a new key.
- Test a target from the popup before saving or while editing.
