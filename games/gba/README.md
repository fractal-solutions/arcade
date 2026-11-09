# Game Boy Advance Cabinet

A bring-your-own-ROM handheld cabinet for `WASM Arcade`, built on
[EmulatorJS](https://github.com/EmulatorJS/EmulatorJS) 4.2.3 and the **mGBA**
core compiled to WebAssembly. No commercial ROMs are bundled or linked.

## What is included

- `index.html` — cabinet shell, ROM picker, drag/drop, boot/error UI, fullscreen.
- `gba.js` — ROM validation, Blob URL boot, `?rom=` support, EmulatorJS loading,
  fullscreen handling and lazy touch-control setup.
- `gba-controls.js` — D-pad, A/B/L/R/Start/Select touch rails, haptics and direct
  `gameManager.simulateInput()` wiring.
- `../../vendor/emulatorjs/` — the vendored EmulatorJS 4.2.3 runtime and mGBA core.

## Supported files

| Format | Core | Notes |
| --- | --- | --- |
| `.gba` | mGBA | Game Boy Advance |
| `.gb` | mGBA | Game Boy / Game Boy Color compatibility |
| `.gbc` | mGBA | Game Boy Color |

Files up to 64 MB are accepted. The ROM is read into a Blob URL in the current
tab and is never uploaded. Reloading the cabinet or pressing **Change ROM**
disposes the running core and the Blob URL.

## Legal sources

Use only:

- homebrew and public-domain releases,
- public-domain or open-source test ROMs, or
- cartridges you dumped yourself.

Commercial ROMs are not distributed by this arcade and should not be committed
to the repository.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| D-pad | Arrow keys | Left D-pad |
| A / B | `Z` / `X` | Right face buttons |
| L / R | `Q` / `E` | Right shoulder buttons |
| Start / Select | `Enter` / `V` | Right utility buttons |

Touch buttons call EmulatorJS's `simulateInput` directly, so they work alongside
a physical keyboard. Haptics are optional and remembered under
`arcade.gba.haptics.v1`.

## Deep links

A same-origin ROM can be booted directly:

```text
games/gba/?rom=homebrew.gba
```

The URL is fetched with `cache: 'no-store'` and turned into a Blob. Cross-origin
`?rom=` URLs are rejected so the cabinet cannot be used to fetch arbitrary files.

## Fullscreen and layout

The cabinet uses the arcade's own fullscreen button and touch rails. EmulatorJS's
virtual gamepad and built-in fullscreen button are disabled. In fullscreen
landscape the game sits between dark left/right control rails; in portrait the
controls move to a dark rail below the screen. Touch controls never overlap the
game viewport.

## Storage

- EmulatorJS keeps mGBA saves, save states and settings in browser storage.
- `arcade.gba.haptics.v1` stores the touch haptics preference.

Clearing site data resets the cabinet.

## Credits

- **EmulatorJS** 4.2.3 — GPL-3.0; see `../../vendor/emulatorjs/LICENSE`.
- **mGBA** — MPL-2.0; the core is distributed as part of the EmulatorJS data.
- Game Boy, Game Boy Color and Game Boy Advance are trademarks of Nintendo.
  This project is not affiliated with or endorsed by Nintendo.
