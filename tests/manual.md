# Firebinds Manual Validation

## Setup

1. Open Firefox.
2. Go to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on**.
4. Select `manifest.json` at the repository root.
5. Open a normal webpage with buttons and links.

## Create and Cancel

- Open the popup and click **Add keybind**.
- Confirm the target method defaults to **Pick element**.
- Hover elements and confirm the orange picker highlight follows the cursor.
- Press Escape and confirm no binding is saved.
- Repeat, click a visible button or link, and confirm the popup reopens or the
  toolbar badge indicates a pending selection.
- Capture a valid key combination, save, and confirm an indicator appears.

## Trigger

- Reload the page.
- Press the saved key combination.
- Confirm the target element receives its normal click or focus behavior.
- Focus a text input and confirm the binding does not interrupt typing unless
  **Allow while typing in fields** is enabled.
- Create a global binding and confirm it triggers on another normal webpage with
  a matching target.

## Text Targets

- Create a **Text** binding for the exact label of a visible button or link and
  confirm it activates that element.
- Create a **Text pattern** binding such as `Add New*` and confirm it matches a
  label like `Add New Project`.
- Try a text query that matches nothing and confirm **Test target** reports a
  missing target.
- Try a text query that matches multiple equal controls and confirm it reports an
  ambiguous target without clicking.

## Profiles

- Create a second profile and add a binding with the same key as the Default
  profile.
- Switch profiles and confirm only the active profile's binding fires.
- Duplicate a profile and confirm copied bindings receive new IDs but keep their
  labels and scopes.
- Delete the active profile and confirm another profile becomes active.
- Confirm deleting the final remaining profile is blocked.

## Indicators

- Create two bindings on one page.
- Confirm both indicators are visible and readable.
- Toggle **Indicators** off in the popup and confirm indicators disappear without
  deleting bindings.
- Toggle them on and confirm indicators return.

## Manage

- Edit a binding key and confirm the indicator text changes.
- Filter the list by target label, key, scope, and status.
- Duplicate a binding and confirm the copy appears with an unset key ready to edit.
- Use **Test** on a binding and confirm it reports Ready, Missing, or Ambiguous.
- Disable a binding and confirm the key no longer fires.
- Enable it and confirm it fires again.
- Reselect a binding target and confirm the old indicator moves to the new target.
- Delete a binding and confirm its indicator disappears.

## Problems

- Try saving a duplicate key combination in the same scope and confirm the popup
  shows a conflict.
- Try browser-reserved combinations such as `Ctrl+L` or `Ctrl+T` and confirm they
  are rejected.
- Open a restricted page such as `about:addons` and confirm the popup explains that
  Firebinds can only run on normal webpages.
- Change the page so a target disappears, press the keybind, and confirm a short
  feedback message appears without deleting the binding.
