# Arcade

A static arcade of local classics, with a local vault of 26 classic Flash games
running in Ruffle and a bring-your-own-ROM Game Boy Advance cabinet powered by
mGBA. Real game code, real pixels, no server-side component.

**Last updated: 2026-11-09**

---

## What's inside

| Cabinet | Path | Engine | Status |
| --- | --- | --- | --- |
| **Dangerous Dave** | `games/dave/` | C reimplementation compiled to `dave.wasm` | Playable out of the box |
| **2048** | `games/2048/` | Freestanding C → 3.5 KB `game.wasm` | Playable out of the box |
| **Quake** | `games/quake/` | Qwasm (Quake engine compiled to WebAssembly) | Playable out of the box with bundled LibreQuake data; your own PAKs optional |
| **Quake II demo** | — | Yamagi Quake II compiled to WebAssembly | Reference only; not included in this arcade |
| **Commander Keen 4** | `games/keen4/` | js-dos 8.5.3 / DOSBox compiled to WebAssembly | Playable out of the box with the bundled shareware episode |
| **Duke Nukem II** | `games/duke2/` | js-dos 8.5.3 / DOSBox compiled to WebAssembly | Playable out of the box with the bundled shareware episode |
| **Prince of Persia 2** | `games/pop2/` | Static 68k-Mac recompilation to WebAssembly | Playable after adding your own game data; bundled DOS demo also available |
| **Prince of Persia 2 (DOS demo)** | `games/pop2demo/` | js-dos 8.5.3 / DOSBox compiled to WebAssembly | Playable out of the box |
| **DOS Cabinet** | `games/dos/` | js-dos 8.5.3 / DOSBox compiled to WebAssembly | Runs a `.jsdos` bundle you supply |
| **DOS Vault (25 cabinets)** | `games/<slug>/` | js-dos 8.5.3 / DOSBox compiled to WebAssembly | Shareware, freeware and demos, all bundled and auto-starting |
| **Flash Vault (26 games)** | `games/flash/` | Locally hosted Ruffle 0.7.1 + bundled SWFs | Playable out of the box; bring-your-own-SWF still supported |
| **Game Boy Advance** | `games/gba/` | EmulatorJS 4.2.3 + mGBA compiled to WebAssembly | Ships with 7 homebrew ROMs; also runs a `.gba` / `.gb` / `.gbc` you supply |

The landing page (`index.html`) is a bespoke, responsive console menu built
around a PS2/PS3-era title list: a fast, searchable index with a live preview
card, D-pad/arrow navigation and type-ahead. A **List / Coverflow** switch in the
masthead toggles the original game-first WebGL coverflow, where textured 3D
covers respond to arrow keys, swipes and on-screen arrows. The coverflow falls
back to the regular game shelf when WebGL is unavailable. Both views keep the
custom cursor on desktop.
The library includes 65 entries: 60 local cabinets (including the 26-game Flash
Vault and the bring-your-own-ROM GBA cabinet) and five reference-only entries
for Quake II, Quake III Arena, Capitalism II/Lab, and GTA 2. The format selector
leads with **All**, **Flash** (New), **WASM**, **DOS** and **GBA** (New),
followed by **Your data** and **References**. Reference entries do not navigate
off-site. Optional
procedural interface sounds and an original
ambient DnB loop—with a slow minor-key chord progression, soft synthesized reverb
and understated breakbeat—are generated locally and start only after choosing
**Sound on**. Audio pauses when the menu tab is hidden or you leave for a game.
The custom pointer reticle remains enabled on desktop. The home menu keeps the
selected game, active filter, shelf position and page position for the current
browser tab, so returning from a game resumes the same place in the library.

The game pages are responsive, and every cabinet has a fullscreen mode designed
for phones in landscape. Quake additionally ships a PSP-style touch pad that
appears automatically on touch devices.

### DOS Vault

Every cabinet below is a self-contained `.jsdos` bundle with its own DOSBox
config. They boot straight into the game, with no file picker and no setup.

| Cabinet | Path | License basis |
| --- | --- | --- |
| **Wolfenstein 3D** | `games/wolf3d/` | Shareware episode (id Software) |
| **DOOM** | `games/doom/` | Shareware episode (id Software) |
| **Heretic** | `games/heretic/` | Shareware episode (Raven / id Software) |
| **Jazz Jackrabbit — Holiday Hare 1994** | `games/jazz/` | Freely distributable holiday episode (Epic) |
| **Cosmo's Cosmic Adventure** | `games/cosmo/` | Shareware episode (Apogee) |
| **Crystal Caves** | `games/crystal/` | Shareware episode (Apogee) |
| **Bio Menace** | `games/biomenace/` | Shareware episode (Apogee) |
| **Jill of the Jungle** | `games/jill/` | Shareware episode (Epic) |
| **Xargon** | `games/xargon/` | Shareware episode (Epic) |
| **Raptor: Call of the Shadows** | `games/raptor/` | Shareware episode (Apogee) |
| **Blake Stone: Aliens of Gold** | `games/blakestone/` | Shareware episode (Apogee) |
| **Ken's Labyrinth** | `games/kenslabyrinth/` | Shareware release (Ken Silverman) |
| **Supaplex** | `games/supaplex/` | Freeware release |
| **ZZT** | `games/zzt/` | Shareware release (Epic) |
| **Scorched Earth** | `games/scorched/` | Shareware release |
| **Sopwith** | `games/sopwith/` | Freeware release |
| **Halloween Harry** | `games/harry/` | Shareware episode (Apogee) |
| **Solar Winds** | `games/solarwinds/` | Shareware episode (Epic) |
| **Tyrian 2000** | `games/tyrian/` | Freeware release (Epic) |
| **One Must Fall: 2097** | `games/omf/` | Freeware release (Epic) |
| **Epic Pinball** | `games/epicpinball/` | Shareware tables (Epic) |
| **Hocus Pocus** | `games/hocus/` | Shareware episode (Apogee) |
| **Major Stryker** | `games/majorstryker/` | Freeware release, all three episodes (Apogee) |
| **Capitalism** | `games/capitalism/` | Playable demo (Interactive Magic) |
| **Prince of Persia 2 (DOS demo)** | `games/pop2demo/` | Freely distributable demo (Brøderbund) |

**Reference entries:** Quake II, Quake III Arena, Capitalism II/Lab, and GTA 2
are shown for context but are not playable here; no external game links are
provided. No commercial game data is bundled. The free *Carmageddon* demo was evaluated
but does not boot reliably under this js-dos build, so it is not listed as
playable. The Mac PoP2 cabinet continues to support bring-your-own full data.

### Flash Vault

The **Flash** filter opens `games/flash/`, a local vault of 26 SWF games. Every
file lives in `games/flash/swf/` and runs in the locally hosted Ruffle 0.7.1
runtime. The vault has a searchable, genre-filtered grid, a random pick,
fullscreen, last-played memory and a bring-your-own-SWF panel. Deep links work:
`games/flash/?game=n` opens a specific game directly.

| Game | Year | Genre |
| --- | --- | --- |
| **N** | 2004 | Platformer |
| **QWOP** | 2008 | Ragdoll sport |
| **The World's Hardest Game** | 2008 | Reflex puzzle |
| **Bloxorz** | 2007 | Puzzle |
| **Achievement Unlocked** | 2008 | Puzzle platformer |
| **Motherload** | 2004 | Mining sim |
| **Interactive Buddy** | 2005 | Sandbox |
| **Age of War** | 2007 | Lane strategy |
| **Bloons TD 2** | 2009 | Tower defense |
| **Learn to Fly** | 2009 | Launch game |
| **Doodle Jump** | 2009 | Arcade |
| **The Fancy Pants Adventure** | 2006 | Platformer |
| **Riddle School** | 2006 | Point and click |
| **Storm the House** | 2005 | Defense shooter |
| **Portal: The Flash Version** | 2007 | Puzzle platformer |
| **Super Meat Boy** | 2008 | Masocore platformer |
| **Pandemic 2** | 2008 | Outbreak sim |
| **Papa's Pizzeria** | 2007 | Management sim |
| **Duck Life** | 2007 | Racing RPG |
| **Stick RPG** | 2003 | Life sim |
| **Rubik's Cube** | 2007 | Puzzle |
| **Checkers** | 2007 | Board game |
| **Minesweeper** | 2007 | Puzzle |
| **Pac-Man** | 2007 | Arcade |
| **Tetris** | 2007 | Puzzle |
| **Snake** | 2007 | Arcade |

The files are preservation copies of games that were freely playable on the web.
They were downloaded from public preservation collections
([AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory)
and [selenite-cc/flasharchive](https://github.com/selenite-cc/flasharchive)) and
are kept here for private, local play. Game names, code and artwork remain with
their original creators; this project does not sell, relicense or claim them.
If you are a rights holder and want a title removed, delete its SWF, its cover
art and its entry in `games/flash/catalog.json`.

Ruffle runs many—but not all—SWFs. A few titles may have missing audio, video or
AVM2 edge cases. The page keeps a **Load your own SWF** panel for files that are
not in the vault. The player does not draw the arcade's custom cursor, so the
game pointer and the system pointer stay aligned. The Flash category contains no
outbound game links.

The locally hosted Ruffle 0.7.1 web runtime is from the
[official Ruffle release](https://github.com/ruffle-rs/ruffle/releases/tag/v0.7.1).
Its MIT and Apache 2.0 license texts are included in `vendor/ruffle/`.

> **Glace:** `assets/glace-1.png` and `assets/glace-2.png` are kept in the repo,
> but there is no Glace game data or WebAssembly port in this project, so Glace is
> intentionally not listed in the selector. Nothing was deleted.

### Game Boy Advance

The **GBA** filter includes `games/gba/`, a handheld cabinet built on
vendored **EmulatorJS 4.2.3** with the **mGBA** core compiled to WebAssembly.
No commercial ROMs are bundled. Seven freely distributable homebrew ROMs ship
with the cabinet and are listed in its picker, so you can play immediately.
You can also drop or choose a `.gba`, `.gb` or `.gbc` file you own (up to 64 MB);
the file is read into a Blob URL in the current tab and is never uploaded.
Legal homebrew, public-domain test ROMs and self-dumped cartridges are the
intended sources. Saves and save states stay in this browser's storage.

The arcade's own fullscreen button and touch rails remain authoritative:
EmulatorJS's virtual gamepad and fullscreen buttons are disabled. The core is
loaded locally from `vendor/emulatorjs/`, and `?rom=game.gba` can boot a
same-origin ROM placed next to the cabinet. A handful of freely distributable
homebrew ROMs are bundled in `games/gba/roms/` for testing; see
`games/gba/roms/README.md` for provenance and licenses.

---

## Run it

WASM and the DOS layer must be served over HTTP; opening `index.html` from
`file://` will not work.

```sh
cd arcade
./tools/serve.sh          # bind 0.0.0.0:8000 and print your addresses
./tools/serve.sh 9000     # custom port
HOST=127.0.0.1 ./tools/serve.sh   # loopback only
```

`serve.sh` binds to **all interfaces** by default so phones, tablets and other
computers on the same Wi-Fi can connect. It prints:

- **Local** — `http://127.0.0.1:8000/` on this machine
- **Network** — `http://<lan-ip>:8000/` for other devices on the same network
- **Public** — your internet-facing IP, if `curl` can look it up

Use the **Network** URL on another device on the same Wi-Fi. The **Public** URL
only works from the internet if your router forwards the port to this device
(and your ISP does not use carrier-grade NAT); it is not needed locally.

Or use any static server:

```sh
python3 -m http.server 8000 --bind 0.0.0.0
# or: npx serve .
```

Then open `http://<your-computer-ip>:8000/` on the phone.

**Requirements:** a modern evergreen browser with WebAssembly. No cross-origin
isolation (`COOP`/`COEP`) headers are required. `.wasm` should be served as
`application/wasm` (most static hosts already do).

---

## Controls

### Dangerous Dave

| Action | Keys |
| --- | --- |
| Move / climb | Arrow keys or `WASD` |
| Jump | `Space`, `Z`, `X`, or `↑` |
| Fire | `Ctrl`, `J` |
| Jetpack | `Alt`, `K` |
| Pause | `P` / `Esc` |
| Confirm / menu | `Enter`, `Space` |

On touch devices the in-game d-pad and action buttons are provided. Fullscreen
is available from the cabinet header.

### Prince of Persia 2

Keyboard: arrow keys move, `Shift` sneaks/strikes, `Space` jumps/action,
`Esc` opens the menu. Touch controls are included on the game page. If you do
not have the Mac data archive, use the **Play the bundled DOS demo now** link on
the data prompt, or open `games/pop2demo/` directly.

### DOS Vault

All 25 DOS cabinets pass keyboard input straight to DOSBox. Click the game once
to capture the mouse where the game needs it; `Esc` releases it. Standalone
games use their original keys (arrows/WASD, `Ctrl`, `Space`, `Enter`, function
keys). Every cabinet has a **Fullscreen** button in the header. Touch devices
get per-game action controls, plus a **Keyboard** toggle in the controller
settings for an on-screen QWERTY keyboard. **Key labels** switches the action
buttons to their literal keyboard keys; a physical keyboard works when the game
is focused.

### 2048

Arrow keys or `WASD` move the board; you can also swipe the board or use the
on-screen d-pad. The board is a real WebAssembly engine; rendering is DOM + CSS.

### Quake

Desktop: `WASD` moves, the mouse looks, `Ctrl` or left-click fires, `Space`
jumps, `Tab` shows the scores, `Esc` opens the menu, and the mouse wheel changes
weapons. The cabinet boots with bundled **LibreQuake** data — press *Launch
LibreQuake* and play. If you own the original game you can instead load
`PAK0.PAK` (shareware) or `PAK0.PAK` + `PAK1.PAK` (full) from the boot panel.

On phones, start the game, tap **Fullscreen**, and rotate to landscape. The
PSP-style overlay provides:

| Control | Action |
| --- | --- |
| Left stick | Move / strafe (arrow keys while the menu is open) |
| Right pad | Look around |
| **Fire** | Fire; `Enter` to select while the menu is open |
| **Jump** | Jump |
| **Menu** | Open/close the Quake menu and switch the stick to menu navigation |
| **Stat** | Show scores / status (`Tab`) |
| ◀ WPN / WPN ▶ | Previous / next weapon |

The **Pad** button in the header toggles the overlay on desktop. The choice is
remembered per browser under `arcade.quake.pad`.

### Commander Keen 4 and Duke Nukem II

Both cabinets boot their bundled shareware episodes automatically inside js-dos.
Use the keyboard as in the original DOS games, or the arcade touch controls on
touch devices. The d-pad moves, and named touch actions are mapped to the
original keys (for example, DOOM has Fire, Use, Run, Strafe, Map, and Menu).
Small key hints show each action's keyboard binding. **Fullscreen** in the
cabinet header expands the DOS screen.

### DOS Cabinet

Use the built-in js-dos UI to choose a `.jsdos` bundle (or load one by URL).
Keyboard input is passed through to DOSBox. Use the **Fullscreen** button in the
cabinet header for an immersive view. Touch layouts can be switched between
D-pad, analog, and PSP-style D-pad + analog; first-person DOS titles also offer
dual analog movement and mouse-look.

### Flash Vault

Open `games/flash/` from the **Flash** filter or any Flash card. The vault has
two views: the game shelf, and a dedicated **Now Playing** view that opens as
soon as you pick a card (or press **Surprise me**). The player never sits below
the fold, and **Back** unloads the game and returns to the shelf at the scroll
position you left. The search box matches titles, genres and descriptions; the
genre menu narrows the grid. Each game keeps its own controls — the caption
under the player shows the expected keys or mouse input for the selected title.
The player takes keyboard focus when a game loads, and clicking the picture
refocuses it.

Most of these games expect a keyboard, so the player has an optional **Keys**
pad: a d-pad or analog stick, Space/Enter/Esc, Shift/Ctrl/Alt and Q/W/O/P
buttons that send real key events to Ruffle. It appears automatically on touch
devices and can be toggled from the toolbar; the preference is remembered. The
Q/W/O/P cluster only appears for games that use those keys. **D-Pad / Analog**
switches the movement control; analog mode uses the same dead zone and nub
travel as the DOS cabinets and remembers the choice.

**Fullscreen** expands the player; on Android/Chrome it also tries to lock to
landscape, while iOS Safari falls back to an immersive CSS layout with a rotate
hint. The toolbar hides by default in fullscreen — swipe down from the top edge,
tap the top-left tab, or use the brief reveal shown on entry to bring it back.
It auto-hides when idle, and swiping up on the bar dismisses it. Deep links such
as `games/flash/?game=portal-flash` open a game directly.

The **Load your own SWF** panel at the bottom of the page accepts any local
`.swf`; the file is read into memory, checked for a valid `FWS`/`CWS`/`ZWS`
header and never uploaded or persisted.

### Game Boy Advance

Load a ROM, then use a physical keyboard or the on-screen controls:

| Action | Keys |
| --- | --- |
| D-pad | Arrow keys |
| A / B | `Z` / `X` |
| L / R | `Q` / `E` |
| Start / Select | `Enter` / `V` |

On touch devices the cabinet adds a D-pad on the left and A/B/L/R/Start/Select
on the right. Buttons use EmulatorJS's direct input API, so they work alongside
the keyboard. Haptics can be toggled from the controller settings and are
remembered under `arcade.gba.haptics.v1`. **Change ROM** reloads the cabinet so
the running core and Blob URL are disposed cleanly.

---

## Mobile, landscape and fullscreen

- Every playable cabinet has a fullscreen control. On Android/Chrome the page
  requests the Fullscreen API and, where supported, locks the screen to
  landscape. On iOS Safari, where element fullscreen and orientation lock are
  unavailable, the same control switches to an immersive CSS layout and a
  “rotate your phone” hint.
- Fullscreen layouts hide the site chrome, the page HUD/panels and the back
  button, then size the game surface from the **smaller** viewport axis so the
  whole board/screen fits without scrolling.
- **2048:** in short landscape (`max-height: 430px`) the board is sized with
  `min(74vh, 54vw)` and the play area is padded below the floating HUD. The
  d-pad sits in the bottom-right corner and does not overlap the board. In
  portrait, the board and d-pad stack vertically.
- **Dangerous Dave:** the canvas fills the viewport with `object-fit: contain`
  and touch controls float in the bottom corners, so the picture stays as large
  as possible.
- **Quake:** the canvas is scaled to the stage with `object-fit: contain`
  behaviour, so a 800×450 or 1280×720 framebuffer fits any landscape phone
  without cropping. The PSP overlay uses `env(safe-area-inset-*)` and a compact
  layout below `520px` height; the header collapses to a half-transparent bar
  over the game in fullscreen.
- **Keen 4 / Duke Nukem II / DOS Vault / DOS Cabinet:** touch devices get
  movement and per-game named action buttons that send keyboard input to DOSBox.
  In fullscreen landscape, the game stays centered between left/right controls;
  in portrait, controls sit below the game. The game keeps its aspect ratio in
  the remaining space. Choose **D-Pad**, **Analog**, **PSP Combo** (both on the
  move side), or—on first-person games—**Dual Analog** (right stick sends mouse
  look). The D-pad center sends Enter/confirm. Haptics can be toggled where the
  browser and device support vibration. Desktop keyboard and mouse controls
  remain unchanged.
- **Flash Vault:** the Ruffle player takes keyboard focus when a game loads. The
  optional **Keys** pad adds a D-pad or analog stick, Space/Enter/Esc,
  Shift/Ctrl/Alt and Q/W/O/P, sends real key events to the SWF, and floats over
  the picture in fullscreen. It defaults on for touch devices; the key-pad and
  D-pad/analog choices are remembered. In fullscreen the toolbar hides by
  default and returns from the top edge, the top-left tab, or a swipe.
- **Game Boy Advance:** in fullscreen landscape the game sits centered between
  dark left and right rails, with the D-pad on the left and A/B/L/R/Start/Select
  on the right. In portrait the controls move to a dark rail below the screen.
  Touch controls never overlap the game viewport. The cabinet toolbar hides by
  default in fullscreen and returns from the top-left tab, a top-edge swipe, or
  a tap near the top edge.
- The mobile action cluster uses the familiar four-button diamond for primary
  actions, with secondary actions below it.
- **Prince of Persia 2:** the data prompt is compact, scrolls inside the 4:3
  stage, and includes a visible **Back to the arcade** link so it never traps the
  player. On short landscape it switches to a two-column dropzone and hides
  secondary copy.
- The landing page uses `viewport-fit=cover` and `env(safe-area-inset-*)` so
  notches and rounded corners do not clip controls. On narrow phones the game
  filter wraps into a two-column grid instead of a horizontally clipped strip.

All animations (warp field, aurora, ticker, glitch, tilt, reticle) are disabled
automatically under `prefers-reduced-motion: reduce`.

---

## Saves and privacy

Everything is local. Nothing is uploaded.

| Key | Used by | Contents |
| --- | --- | --- |
| `arcade.dave.progress.v1` | Dangerous Dave | `{ highestLevel, bestScore, updated }` |
| `rea2048:best` | 2048 | Best score as a number |
| `arcade.quake.pad` | Quake | `1` / `0` — touch pad preference |
| `arcade.flash.last.v1` | Flash Vault | Slug of the last game played |
| `arcade.flash.keys.v1` | Flash Vault | `1` / `0` — touch key pad preference |
| `arcade.flash.pad.v1` | Flash Vault | `dpad` / `analog` — movement control |
| `arcade.gba.haptics.v1` | Game Boy Advance | `1` / `0` — touch haptics preference |
| IndexedDB | Prince of Persia 2 | Cached `pop2-data.tar.gz` and saved games |
| js-dos storage | Keen 4, Duke Nukem II, DOS Vault, DOS Cabinet | DOSBox saves, configs and bundle state |
| EmulatorJS storage | Game Boy Advance | mGBA saves, save states and settings |

Clearing site data resets the arcade.

---

## Bring your own game data

### Prince of Persia 2

The web engine ships **without** the copyrighted Macintosh game files. See
`games/pop2/SELF-HOSTING.md` for the full walkthrough. Short version, on a
desktop with `unar` and `python3`:

```sh
git clone https://github.com/mac-recomp/pop2
cd pop2
tools/prep-web-data.sh "Prince_Of_Persia2.sit" /tmp/pop2
mv /tmp/pop2/vol /tmp/pop2/pop2
tar --format=ustar -czhf pop2-data.tar.gz -C /tmp/pop2 app data pop2
```

Open `games/pop2/` and drop the archive in, or link it directly:
`games/pop2/?data=pop2-data.tar.gz`. It is cached in IndexedDB after the first
load, so later visits work offline. The on-page prompt scrolls inside the game
stage and includes a **Back to the arcade** link, so you can leave at any time.

### Quake

The cabinet bundles **LibreQuake**, a free and open data set, and needs no setup.
To play the original game instead, load PAKs from a copy you own:

- `PAK0.PAK` — the shareware episode (works on its own)
- `PAK0.PAK` + `PAK1.PAK` — the registered game

Choose **Load PAK files** in the boot panel, then **Play supplied PAKs**. Files
stay in the page's memory and are never uploaded. Commercial Quake data is not
redistributed by this arcade.

### Commander Keen 4 and Duke Nukem II

These cabinets contain their original freely distributable shareware episodes,
bundled as `games/keen4/keen4.jsdos` and `games/duke2/duke2.jsdos`. They start
automatically. Replace the `.jsdos` file with your own bundle if you own a
different episode, keeping the same filename.

### DOS Cabinet

The emulator is included; the games are not. Create a `.jsdos` bundle from a
game you own:

1. Put the game's files in a folder.
2. Add `.jsdos/dosbox.conf` with an `[autoexec]` section, for example:

   ```ini
   [autoexec]
   mount c .
   c:
   GAME.EXE
   ```

3. Zip the **contents** of the folder (not the folder itself) and rename the
   archive to `mygame.jsdos`.
4. Open `games/dos/` and choose the file, or load it by URL:
   `games/dos/?url=mygame.jsdos`.

`test-keen.html` is a minimal harness that boots `test/keen4.jsdos`; it is handy
for checking that the vendored js-dos layer works.

### Game Boy Advance

The emulator is included; the ROMs are not. Open `games/gba/` and drop or choose
a `.gba`, `.gb` or `.gbc` file you own, or point the cabinet at a same-origin ROM:

```text
games/gba/?rom=homebrew.gba
```

The `?rom=` file must be hosted on the same site. The ROM is fetched into a Blob
URL, so nothing is uploaded and no path is stored. Only use homebrew,
public-domain test ROMs or cartridges you dumped yourself; commercial ROMs are
not distributed by this arcade.

---

## Adding a cabinet

1. Create `games/<slug>/` with an `index.html` and its assets. Keep every path
   relative so the arcade stays portable.
2. Add an `<article class="cabinet" data-game="<slug>" data-kind="...">` card in
   `index.html`. `data-kind` is one of:
   - `wasm` — a game compiled to WebAssembly that runs immediately
   - `dos` — a DOSBox/js-dos cabinet (may bundle a free episode or accept a bundle)
   - `gba` — the Game Boy Advance cabinet
   - `data` — an engine that needs data supplied by the player
   - `flash` — a card that opens the local Flash Vault (`games/flash/?game=<slug>`)
3. Use an existing card as the template for the art, chips, progress line and
   call to action. Add an `assets/<slug>.svg` or `.png` poster if you have one.
4. Update the filter counts only if you change the kinds: the numbers in the
   selector are recalculated at load time by `arcade.js` from `data-kind`, and
   the HUD cabinet count is recalculated from the number of cards.
5. If the game needs an explainer, add a `<dialog class="sheet">` and a
   `data-open="<dialog-id>"` button, following the PoP2 and DOS examples.
6. Save progress under a namespaced key such as `arcade.<slug>.progress.v1`, then
   surface it in the card's `.progress` element and `arcade.js`.

The landing page is plain HTML/CSS/JS with no build step. Keep it that way.

---

## Project layout

```text
arcade/
├── index.html              landing page, HUD, selector, help dialogs
├── style.css               futuristic responsive design
├── arcade.js              clock, filters, save state, telemetry, tilt, starfield
├── assets/                 posters, in-game shots, favicon, Glace artwork (unused)
├── games/
│   ├── dave/               Dangerous Dave cabinet
│   ├── 2048/               2048 cabinet + WASM engine
│   ├── quake/              Quake (Qwasm) + bundled LibreQuake data
│   ├── keen4/              Commander Keen 4 js-dos cabinet + bundle
│   ├── duke2/              Duke Nukem II js-dos cabinet + bundle
│   ├── _shared/            shared js-dos shell (emu.css, emu.js)
│   ├── pop2/               Prince of Persia 2 cabinet + self-hosting docs
│   ├── pop2demo/           Prince of Persia 2 DOS demo cabinet + bundle
│   ├── dos/                js-dos cabinet
│   ├── flash/              Flash Vault page, catalog, 26 bundled SWFs
│   ├── gba/                Game Boy Advance cabinet (BYO ROM, EmulatorJS + mGBA)
│   └── <slug>/             25 DOS Vault cabinets, each with its own .jsdos bundle
├── assets/flash/           generated SVG cover art for the Flash Vault
├── assets/gba.svg          Game Boy Advance poster art
├── vendor/js-dos/          vendored js-dos 8.5.3 and emulator cores
├── vendor/ruffle/          vendored Ruffle 0.7.1 web runtime
├── vendor/emulatorjs/      vendored EmulatorJS 4.2.3 runtime and mGBA core
├── test/                   sample .jsdos bundles for the test harness
├── test-keen.html          minimal js-dos smoke test
└── tools/
    ├── serve.sh            static server helper
    └── make-flash-art.ps1  regenerates Flash Vault cover art from catalog.json
```

---

## Credits and licensing

- **Dangerous Dave** — original game by John Romero. This cabinet runs an
  open-source C reimplementation compiled to WebAssembly.
- **2048** — original game by Gabriele Cirulli. The WASM engine here is an
  independent reconstruction from the `rea-lab` reverse-engineering project,
  not the original game source.
- **Quake** — original game by id Software. The engine is
  [Qwasm](https://github.com/GMH-Code/Qwasm) by Gregory Maynard-Hoare, compiled
  to WebAssembly and distributed under its own license (`games/quake/license.txt`).
  The bundled game data is **LibreQuake** (Modified BSD media), a free and open
  replacement data set; it is not the commercial Quake data. See
  `games/quake/data/README.txt`.
- **Commander Keen 4: Goodbye Galaxy** — original game by id Software, published
  by Apogee. The cabinet bundles the freely distributable shareware episode.
- **Duke Nukem II** — original game by Apogee Software. The cabinet bundles the
  freely distributable shareware episode.
- **Prince of Persia 2: The Shadow and the Flame** — original game by Jordan
  Mechner / Brøderbund. The Mac cabinet contains only the recompiled engine; game
  data is supplied by the player. See `games/pop2/SELF-HOSTING.md`. The separate
  `pop2demo` cabinet bundles the freely distributable DOS demo.
- **DOS Vault** — each cabinet bundles a freely distributable shareware episode,
  freeware release or demo. Credits remain with the original authors and
  publishers: id Software, Apogee Software / 3D Realms, Epic MegaGames, Raven
  Software, Ken Silverman, Interactive Magic and Brøderbund. See the table above
  for the license basis of each title. No full commercial game data is included.
- **Flash Vault** — 26 classic Flash games, kept as preservation copies for
  private local play. Names, code and artwork belong to their original creators
  and publishers. Source repositories and per-file provenance are documented in
  `games/flash/README.md`. No title is sold, relicensed or claimed by this
  project.
- **Ruffle** — the Flash emulator used by the vault, by Ruffle contributors,
  distributed under MIT / Apache 2.0; see `vendor/ruffle/`.
- **Game Boy Advance** — the cabinet runs **EmulatorJS 4.2.3** with the **mGBA**
  core, both compiled to WebAssembly. EmulatorJS is distributed under GPL-3.0;
  mGBA is distributed under MPL-2.0. No commercial ROMs are bundled or linked.
  See `vendor/emulatorjs/LICENSE` and `games/gba/README.md`.
- **js-dos** — by Tommy Visic and contributors, distributed under its own
  license; see `vendor/js-dos/`.
- **Glace artwork** — retained in `assets/`; no engine or game data is included.

Game names and artwork belong to their respective owners. This project hosts
engines, freely distributable shareware/freeware releases, demos and open data.
Prince of Persia 2, the generic DOS cabinet and the Game Boy Advance cabinet run
data you supply yourself.
*Capitalism Lab* is a Windows-only commercial game and does not run in this
DOSBox arcade; the 1995 *Capitalism* DOS demo is the closest legal substitute.
*Carmageddon* is commercial and its demo did not boot reliably here. Do not
commit game data you do not have the right to distribute.
