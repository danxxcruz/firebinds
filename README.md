<p align="center">
  <img src="icons/icon48.png" alt="Firebinds icon" width="72" height="72">
</p>

<h1 align="center">Firebinds</h1>

<p align="center">
  Custom keyboard shortcuts for the web, managed from one clean browser popup.
</p>

<p align="center">
  <a href="https://addons.mozilla.org/es-MX/firefox/addon/firebinds/">
    <img alt="Install on Firefox" src="https://img.shields.io/badge/Install-Firefox%20Add--on-FF7139?style=for-the-badge&logo=firefoxbrowser&logoColor=white">
  </a>
</p>

<p align="center">
  <a href="https://github.com/danxxcruz/firebinds/actions/workflows/release.yml">
    <img alt="Release workflow" src="https://github.com/danxxcruz/firebinds/actions/workflows/release.yml/badge.svg">
  </a>
  <a href="https://github.com/danxxcruz/firebinds/releases">
    <img alt="GitHub release" src="https://img.shields.io/github/v/release/danxxcruz/firebinds?label=release">
  </a>
  <a href="https://addons.mozilla.org/es-MX/firefox/addon/firebinds/">
    <img alt="Firefox Add-on version" src="https://img.shields.io/amo/v/firebinds?label=firefox">
  </a>
</p>

Firebinds lets you bind keyboard shortcuts to buttons, links, inputs, and other
interactive webpage elements. It is built for people who keep reaching for the
same controls over and over and would rather press a key than chase the UI.

Everything is configured inside the extension popup. The webpage only handles
element picking, key listening, small shortcut indicators, and passive feedback.

## Highlights

- Pick elements visually, with click or `Q` confirmation.
- Match targets by exact text or wildcard patterns like `Add New*`.
- Use page, site, or global scopes.
- Create profiles for different workflows.
- Show small on-page key indicators for bound elements.
- Export/import backups for browser migrations.
- Package Firefox and Chrome builds from the same source tree.
- No external accounts, no remote service, no tracking pipeline.

## Install

### Firefox

Install from Mozilla Add-ons:

[![Install on Firefox](https://img.shields.io/badge/Install-Firefox%20Add--on-FF7139?style=for-the-badge&logo=firefoxbrowser&logoColor=white)](https://addons.mozilla.org/es-MX/firefox/addon/firebinds/)

For local development:

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `manifest.json` from this repository.
4. Open a normal webpage and click the Firebinds toolbar icon.

### Chrome / Chromium

There are no current plans to upload Firebinds to the Chrome Web Store. Google
charges a one-time developer registration fee, and I am not paying five dollars
just to list this there.

Chrome and Chromium users can still load the extension manually:

```powershell
npm run build:chrome
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load
unpacked**, and choose `dist/chrome`.

## How It Works

1. Click **Add keybind** in the popup.
2. Choose a target method:
   - **Pick element** to select a specific element on the page.
   - **Text** to match an interactive element by exact label/text.
   - **Text pattern** to match a wildcard such as `Add New*`.
3. Choose page, site, or global scope.
4. Press the desired key combination.
5. Save, then use the shortcut on the page.

The popup also lets you edit, duplicate, test, disable, reselect, and delete
bindings. Indicators and debug logging live under **Options**.

## Profiles And Backups

Firebinds creates a **Default** profile automatically. Use the profile controls
to create, rename, duplicate, delete, or switch profiles. Only the active
profile's bindings apply to the current page.

Use **Backup > Export backup** to save profiles, keybinds, and settings as JSON.
Use **Backup > Import backup** to restore that file in another browser profile
or device. Importing replaces the current Firebinds data after confirmation.

## Privacy

Firebinds stores configuration in browser extension storage. It does not require
an account, does not phone home, and does not collect personal data.

The extension asks for broad webpage access because content scripts need to run
on pages where you want shortcuts. The actual binding setup still happens in the
popup, and backup files are created locally by your browser.

## Build

The source extension is Firefox-first, with build scripts that create clean
browser-specific outputs for release automation.

```powershell
npm run build:firefox
npm run build:chrome
npm run package:firefox
npm run package:chrome
npm run validate
```

Build output is written to `dist/` and ignored by Git.

- Firefox keeps Gecko metadata, data collection declarations, and background
  scripts.
- Chrome uses a generated MV3 service worker manifest and omits Firefox-only
  metadata.

## Releases

Pushing to `main` runs the release workflow. It validates the source, packages
Firefox and Chrome zips, creates a GitHub release, and uploads both artifacts.

Browser stores require monotonically increasing extension versions, so bump
`manifest.json` and `package.json` before uploading a new public build.
