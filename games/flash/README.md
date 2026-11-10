# Flash Vault

A local shelf of 26 classic Flash games. Every `.swf` in `swf/` is served from
this folder and played in the browser by the vendored **Ruffle 0.7.1** runtime
(`../../vendor/ruffle/`). There is no plugin, no account and no outbound game
request once the page is loaded.

> These are **preservation copies for private, local play**. Game names, code and
> artwork belong to their original creators and publishers. Nothing here is sold,
> relicensed or claimed by this project. See [Provenance](#provenance) and
> [Removal](#removal).

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Vault page: hero, player, search/filter grid, bring-your-own-SWF panel |
| `flash.css` | Responsive dark UI, shelf/player views, fullscreen and mobile layouts |
| `flash.js` | Catalog loading, grid, deep links, search/filter, random, Ruffle, fullscreen, touch keys and analog stick |
| `catalog.json` | Source of truth for titles, files, posters, years, genres, accents and controls |
| `swf/` | The 26 bundled SWF files |
| `../../assets/flash/` | Generated SVG cover art, one per slug |
| `../../tools/make-flash-art.ps1` | Regenerates the cover art from `catalog.json` |

## How it works

1. `flash.js` fetches `catalog.json` (so the page must be served over HTTP, not
   opened from `file://`).
2. It renders a card per game and wires deep links: `?game=<slug>` selects and
   starts that title.
3. Selecting a game switches from the shelf to a dedicated **Now Playing** view,
   creates a Ruffle player and calls `load({ url })` with the relative
   `swf/<slug>.swf` path. The player is focused after loading so keyboard input
   goes straight to the game; clicking the picture refocuses it. **Back** unloads
   the game and restores the shelf at the scroll position you left.
4. The last played slug is stored under `arcade.flash.last.v1` in
   `localStorage` and shown as a **LAST** badge.
5. The optional **Keys** pad sends `KeyboardEvent`s to Ruffle: a d-pad or analog
   stick, Space/Enter/Esc, Shift/Ctrl/Alt and Q/W/O/P. It is shown automatically
   on touch devices, can be toggled in the toolbar, and the choice is stored
   under `arcade.flash.keys.v1` (`1` / `0`). The movement control is stored under
   `arcade.flash.pad.v1` (`dpad` / `analog`).
6. The **Load your own SWF** panel reads a local file into an `ArrayBuffer`,
   verifies the `FWS` / `CWS` / `ZWS` header and calls `load({ data })`. The file
   is never uploaded. It is remembered in this browser through the shared user
   library, appears in the main arcade list under **Your data**, and is added to
   the vault shelf on the next visit. Saved files open with
   `games/flash/?user=<id>`.

Ruffle can run most, but not all, SWFs. A title may have missing audio, video or
AVM2 edge cases; the player reports load failures in the status line instead of
failing silently.

## Touch keys

| Button | Key event |
| --- | --- |
| D-pad | `ArrowUp` / `ArrowLeft` / `ArrowDown` / `ArrowRight` |
| Analog stick | the same arrow keys, including diagonals |
| Space | `Space` (`key: " "`, `code: "Space"`) |
| Enter | `Enter` |
| Esc | `Escape` |
| Shift / Ctrl / Alt | `ShiftLeft` / `ControlLeft` / `AltLeft` |
| Q / W / O / P | `KeyQ` / `KeyW` / `KeyO` / `KeyP` |

The pad dispatches `KeyboardEvent`s on `window` and focuses the Ruffle player
first. Buttons use pointer capture, so a key stays down while you hold it and
multiple keys can be held at once (needed for QWOP and most platformers). The
movement control sits on the left; Q/W/O/P, Shift/Ctrl/Alt and Space/Enter/Esc
share a right-hand cluster, so the action keys never float over the middle of
the picture. The Q/W/O/P cluster only appears for games whose catalog controls
mention those keys. The pad is hidden until a game is running and can be
toggled with the **Keys** button in the player toolbar.

**D-Pad / Analog** in the toolbar switches the movement control. Analog mode
uses a round stick with the same dead zone and nub travel as the DOS cabinets;
dragging it presses one or two arrow keys and the choice is remembered in
`arcade.flash.pad.v1`.

## Fullscreen

In fullscreen the player toolbar hides by default so the game gets the whole
viewport. Reveal it by swiping down from the top edge, tapping the **Controls**
tab in the top-left corner, or waiting for the brief reveal shown when
fullscreen starts. It hides again after a few idle seconds; swipe up on the bar
to dismiss it immediately. On phones the touch pad keeps movement on the left
and puts Q/W/O/P, modifiers and Space/Enter/Esc in a framed section on the
right; in portrait the right-hand section wraps onto its own row. **Back** (or
Escape) leaves fullscreen.

## Adding a game

1. Drop the `.swf` into `swf/`.
2. Add an entry to `catalog.json` with a unique `slug`, `title`, `file`,
   `poster`, `year`, `genre`, `players`, `accent`, `description` and `controls`.
3. Add a matching SVG at `assets/flash/<slug>.svg`. The quickest route is to add
   a motif to `tools/make-flash-art.ps1` and run it from the repo root:
   `powershell -File tools/make-flash-art.ps1`.
4. Optionally add a home-screen card in `index.html` with
   `data-kind="flash"` and `href="games/flash/?game=<slug>"`.
5. Update the static counts in `index.html` and the table in the root
   `README.md` if the total changes.

## Provenance

The SWFs were downloaded from two public Flash preservation collections on
GitHub. Local filenames were normalised to slugs; the source path is listed so a
file can be re-verified or re-fetched.

| Local file | Title | Source repo | Source path |
| --- | --- | --- | --- |
| `swf/n.swf` | N | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `n.swf` |
| `swf/qwop.swf` | QWOP | [selenite-cc/flasharchive](https://github.com/selenite-cc/flasharchive) | `QWOP.swf` |
| `swf/worlds-hardest-game.swf` | The World's Hardest Game | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `the-world's-hardest-game.swf` |
| `swf/bloxorz.swf` | Bloxorz | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `bloxorz.swf` |
| `swf/achievement-unlocked.swf` | Achievement Unlocked | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `achievement-unlocked.swf` |
| `swf/motherload.swf` | Motherload | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `motherload.swf` |
| `swf/interactive-buddy.swf` | Interactive Buddy | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `interactive-buddy.swf` |
| `swf/age-of-war.swf` | Age of War | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `age-of-war.swf` |
| `swf/bloons-td-2.swf` | Bloons TD 2 | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `bloons-tower-defence-2.swf` |
| `swf/learn-to-fly.swf` | Learn to Fly | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `learn-to-fly.swf` |
| `swf/doodle-jump.swf` | Doodle Jump | [selenite-cc/flasharchive](https://github.com/selenite-cc/flasharchive) | `Doodle Jump.swf` |
| `swf/fancy-pants.swf` | The Fancy Pants Adventure | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `the-fancy-pants-adventure-1.swf` |
| `swf/riddle-school.swf` | Riddle School | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `riddle-school.swf` |
| `swf/storm-the-house.swf` | Storm the House | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `storm-the-house.swf` |
| `swf/portal-flash.swf` | Portal: The Flash Version | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `portal-flash.swf` |
| `swf/super-meat-boy.swf` | Super Meat Boy | [selenite-cc/flasharchive](https://github.com/selenite-cc/flasharchive) | `Super Meat Boy.swf` |
| `swf/pandemic-2.swf` | Pandemic 2 | [selenite-cc/flasharchive](https://github.com/selenite-cc/flasharchive) | `Pandemic 2.swf` |
| `swf/papas-pizzeria.swf` | Papa's Pizzeria | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `papas-pizzeria.swf` |
| `swf/duck-life.swf` | Duck Life | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `duck-life-1.swf` |
| `swf/stick-rpg.swf` | Stick RPG | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `stick-rpg.swf` |
| `swf/rubiks-cube.swf` | Rubik's Cube | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `rubiks-cube.swf` |
| `swf/checkers.swf` | Checkers | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `checkers.swf` |
| `swf/minesweeper.swf` | Minesweeper | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `minesweeper.swf` |
| `swf/pacman.swf` | Pac-Man | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `pacman.swf` |
| `swf/tetris.swf` | Tetris | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `tetris.swf` |
| `swf/snake.swf` | Snake | [AmmarSAA/Flash-Games-Directory](https://github.com/AmmarSAA/Flash-Games-Directory) | `snake.swf` |

All 26 files were checked for a valid `FWS`, `CWS` or `ZWS` header after
download. Total size is about **42 MB**. The cover art in `assets/flash/` is
original abstract artwork generated by `tools/make-flash-art.ps1`; it does not
copy screenshots or logos from the games.

### Quick re-download

From the repo root, with PowerShell:

```powershell
$base = 'https://raw.githubusercontent.com/AmmarSAA/Flash-Games-Directory/main'
Invoke-WebRequest "$base/n.swf" -OutFile games/flash/swf/n.swf
# ...repeat per row above, or use selenite-cc/flasharchive for the four titles it hosts
```

The source repositories may change or be taken down; this folder is a snapshot,
not a live mirror.

## Removal

If you are a rights holder and want a title removed, delete:

1. its SWF in `swf/`,
2. its cover in `assets/flash/`,
3. its object in `catalog.json`,
4. its card in the root `index.html` (and adjust the static counts),
5. its row in the root `README.md` table.

No other copy is kept by this project.

## Runtime

Ruffle is vendored from the
[official 0.7.1 release](https://github.com/ruffle-rs/ruffle/releases/tag/v0.7.1)
and licensed under MIT / Apache 2.0. License texts live in
`../../vendor/ruffle/`.
