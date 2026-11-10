# Game Boy Advance Cabinet

A handheld cabinet for `Arcade`, built on
[EmulatorJS](https://github.com/EmulatorJS/EmulatorJS) 4.2.3 and the **mGBA**
core compiled to WebAssembly. Seven freely distributable homebrew ROMs are
included, and you can load your own. No commercial ROMs are bundled or linked.

## What is included

- `index.html` — cabinet shell, built-in ROM library, drag/drop, boot/error UI,
  fullscreen.
- `gba.js` — ROM validation, Blob URL boot, `?rom=` and `?user=` support,
  EmulatorJS loading, fullscreen handling and lazy touch-control setup.
- `gba-controls.js` — D-pad, A/B/L/R/Start/Select touch rails, haptics and direct
  `gameManager.simulateInput()` wiring.
- `roms/` — a handful of freely distributable homebrew ROMs for testing; see
  `roms/README.md` for provenance and licenses.
- `../../vendor/emulatorjs/` — the vendored EmulatorJS 4.2.3 runtime and mGBA core.
- `../_shared/user-library.js` — shared “Your data” storage for files picked from
  disk.

## Bundled library

The picker lists the seven bundled homebrew ROMs and boots one on tap. The list
matches the main arcade's visual language: index, art tile, title/meta, format
chip and launch arrow, with search and arrow/Home/End keyboard navigation. `UCity`
is a Game Boy Color release and exercises the `.gbc` path. See `roms/README.md`
for provenance and licenses. ROMs you pick from disk are added above the bundled
list and are remembered across reloads.

## Supported files

| Format | Core | Notes |
| --- | --- | --- |
| `.gba` | mGBA | Game Boy Advance |
| `.gb` | mGBA | Game Boy / Game Boy Color compatibility |
| `.gbc` | mGBA | Game Boy Color |

Files up to 64 MB are accepted. The ROM is read into a Blob URL in the current
tab and is never uploaded. Picked files are also stored in this browser through
the shared user library, so they survive reloads and appear in the main arcade
list under **Your data**. Reloading the cabinet or pressing **Change ROM**
disposes the running core and the Blob URL; the saved copy stays available.

## Legal sources

Use only:

- homebrew and public-domain releases,
- public-domain or open-source test ROMs, or
- cartridges you dumped yourself.

Commercial ROMs are not distributed by this arcade and should not be committed
to the repository. A few homebrew ROMs are bundled in `roms/` for testing; see
`roms/README.md` for their sources and licenses.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| D-pad | Arrow keys | Left D-pad |
| A / B | `Z` / `X` | Right face buttons, A above-right of B |
| L / R | `Q` / `E` | Left / right shoulder rails |
| Start / Select | `Enter` / `V` | Small pills under the face buttons |

The touch layout mirrors the real hardware: the D-pad sits on the left, L and R
are separate shoulder buttons at the top corners, A is diagonally above-right of
B, and Select/Start are small pills beneath the face buttons. In fullscreen
landscape the shoulders drop just below the top-left Controls tab so the two do
not overlap.

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

A ROM previously picked from disk can be reopened by its saved id:

```text
games/gba/?user=<id>
```

The id comes from the `arcade.user.index.v1` index and the bytes are read back
from IndexedDB.

Bundled test ROMs:

```text
games/gba/?rom=roms/pong.gba
games/gba/?rom=roms/rkanoid.gba
games/gba/?rom=roms/cebelix.gba
games/gba/?rom=roms/dezgex.gba
games/gba/?rom=roms/mystic_q.gba
games/gba/?rom=roms/pik_roll.gba
games/gba/?rom=roms/ucity.gbc
```

## Fullscreen and layout

The cabinet uses the arcade's own fullscreen button and touch rails. EmulatorJS's
virtual gamepad and built-in fullscreen button are disabled. In fullscreen
landscape the game sits between dark left/right control rails; in portrait the
controls move to a dark rail below the screen. Touch controls never overlap the
game viewport.

## Storage

- EmulatorJS keeps mGBA saves, save states and settings in browser storage.
- `arcade.gba.haptics.v1` stores the touch haptics preference.
- `arcade.user.index.v1` stores the synchronous “Your data” index.
- IndexedDB `arcade-user-data` / `files` stores the bytes of ROMs picked from disk.
- Battery saves are flushed every 30 seconds by default, and save states are kept
  in the browser (`Save State Location → Keep in Browser` in the emulator menu).
- `gba.js` also guards EmulatorJS's shutdown sync: the runtime unmounts
  `/data/saves` before its last persist, which would otherwise push an empty
  filesystem and delete every stored save. An empty local set never removes
  remote saves, so progress survives a reload or server restart.
- Storage is tied to the **exact origin** (scheme + host + port). A different port
  or hostname gets a fresh, empty storage area, so use the same URL each time.
  To move progress between URLs, use the emulator menu's save-state download and
  load buttons, or copy the `.srm` save file with the save-file buttons.

Clearing site data resets the cabinet and removes saved ROMs.

## Credits

- **EmulatorJS** 4.2.3 — GPL-3.0; see `../../vendor/emulatorjs/LICENSE`.
- **mGBA** — MPL-2.0; the core is distributed as part of the EmulatorJS data.
- Game Boy, Game Boy Color and Game Boy Advance are trademarks of Nintendo.
  This project is not affiliated with or endorsed by Nintendo.
