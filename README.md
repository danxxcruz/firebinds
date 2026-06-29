<p align="center">
  <img src="icons/icon.svg" alt="Firebinds icon" width="72" height="72">
</p>

<h1 align="center">Firebinds</h1>

<p align="center">
  Bind a keyboard shortcut to literally any clickable thing on a webpage.
</p>

<p align="center">
  <a href="https://addons.mozilla.org/en-US/firefox/addon/firebinds/">
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
  <a href="https://addons.mozilla.org/en-US/firefox/addon/firebinds/">
    <img alt="Firefox Add-on version" src="https://img.shields.io/amo/v/firebinds?label=firefox">
  </a>
</p>

Firebinds lets you bind keyboard shortcuts to buttons, links, inputs, and other
interactive webpage elements. It is built for people who keep reaching for the
same controls over and over and would rather press a key than chase the UI.

Everything is configured inside the extension popup. The webpage only handles
element picking, key listening, small shortcut indicators, and passive feedback.

## Why I built this

I kept doing the same thing a dozen times a day: reach for the mouse, find the
same button or link I always click, click it, go back to typing. Repeat. It's
a small tax, but it adds up.

Firebinds lets me point at something once: a button, a link, a text input,
whatever, and give it a key. After that I never have to go find it again. My
hands stay on the keyboard, the repetitive stuff gets faster, and my wrists
are happier for it.

## Demo

https://github.com/user-attachments/assets/37064c3c-ff66-45d0-947f-75082c4da4c9

## What it does

- Pick elements visually, with click or `Q` to confirm.
- Match targets by exact text or a wildcard pattern, in case the element
  isn't always in the same spot.
- Scope a binding to the current page, the whole site, or globally.
- Keep separate profiles for different sites or workflows.
- Show small on-page indicators next to bound elements so you know what's
  mapped.
- Export/import backups as JSON when you switch machines or browser
  profiles.
- One source tree builds both the Firefox and Chrome versions.
- No accounts, no remote service, nothing phoning home.

## Install

### Firefox

Install from Mozilla Add-ons:

[![Install on Firefox](https://img.shields.io/badge/Install-Firefox%20Add--on-FF7139?style=for-the-badge&logo=firefoxbrowser&logoColor=white)](https://addons.mozilla.org/en-US/firefox/addon/firebinds/)

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

```
npm run build:chrome
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load
unpacked**, and choose `dist/chrome`.

## How It Works

1. Click **Add shortcut** in the popup.
2. Choose how to target the element:
   - **Pick element** — click it directly on the page.
   - **Text** — match by exact label/text.
   - **Text pattern** — wildcard match.
3. Pick a scope: page, site, or global.
4. Press the key combo you want.
5. Save, then use it on the page.

From the popup you can also edit, duplicate, test, disable, reselect, or
delete any binding. Indicators and debug logging live under **Options**.

## Profiles And Backups

Firebinds creates a **Default** profile automatically. Use the profile
controls to create, rename, duplicate, delete, or switch profiles — only the
active profile's shortcuts apply to the current page.

**Backup → Export backup** saves everything (profiles, shortcuts, settings) as
JSON. **Backup → Import backup** restores that file on another browser or
machine. Importing replaces whatever's currently there, after confirming.

## Privacy

Firebinds stores its config in the browser's local extension storage. No
account, no telemetry, no remote calls.

It does ask for broad webpage access, because the content script needs to run
on whatever page you want shortcuts on — but all the actual setup happens in
the popup, and backups are generated locally in your own browser.

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

Every push to `main` runs CI, which validates the source, packages both
Firefox and Chrome builds, and cuts a GitHub release automatically. Useful,
but it means `main` should always be in a state you're fine shipping — no
pushing half-finished work there for now.

Browser stores require version numbers to only go up, so bump `manifest.json`
and `package.json` before uploading a new public build.

## License

[MPL 2.0](LICENSE)

