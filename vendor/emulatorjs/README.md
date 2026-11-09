# EmulatorJS (vendored)

This directory contains a trimmed copy of **EmulatorJS 4.2.3**, used by the Game
Boy Advance cabinet at `games/gba/`.

## Contents

```text
vendor/emulatorjs/
├── LICENSE                  GPL-3.0
└── data/
    ├── emulator.min.js      EmulatorJS runtime
    ├── emulator.min.css     EmulatorJS styles
    ├── loader.js            loader/config entrypoint
    ├── version.json         version 4.2.3
    ├── compression/         extract7z.js, extractzip.js
    ├── cores/               mgba-wasm.data and legacy/thread variants
    └── localization/        en-US.json
```

The mGBA core archives are 7z-compressed `.data` files. `compression/extract7z.js`
is required and is included so the core can be extracted locally at runtime.

## Usage

The cabinet sets:

```js
EJS_player = '#dos';
EJS_core = 'gba';
EJS_pathtodata = '../../vendor/emulatorjs/data/';
EJS_startOnLoaded = true;
EJS_defaultOptions = { 'virtual-gamepad': 'disabled' };
EJS_Buttons = { fullscreen: false };
```

`gba` covers `.gba`, `.gb` and `.gbc`; EmulatorJS maps it to the `mgba` core.
The arcade's own fullscreen button and touch rails stay authoritative.

## Local patch

The vendored `emulator.min.js` has one local change: `checkForUpdates()` is a
no-op. Upstream calls `https://cdn.emulatorjs.org/stable/data/version.json` when
the page runs on `localhost` or `127.0.0.1`; this arcade is fully local, so the
version check was removed. No other runtime code was changed.

The core downloader still contains upstream's CDN failsafe for missing core
files. All files required by the GBA cabinet are present locally, so it is not
used in normal operation.

## Version and license

- Version: **4.2.3** (`data/version.json`).
- EmulatorJS is distributed under **GPL-3.0**; see `LICENSE`.
- The mGBA core is distributed under **MPL-2.0**.
- Upstream: <https://github.com/EmulatorJS/EmulatorJS>

No ROMs are included in this directory.
