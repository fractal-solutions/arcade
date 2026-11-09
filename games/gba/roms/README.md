# Bundled Homebrew ROMs

These ROMs are **freely distributable homebrew**, included so the cabinet can be
tested and used without hunting for a legal ROM. No commercial ROMs are bundled.

| File | Game | Source | License |
| --- | --- | --- | --- |
| `pong.gba` | Pong | [ZeroDayArcade/Pong-Homebrew-GBA](https://github.com/ZeroDayArcade/Pong-Homebrew-GBA) | MIT |
| `rkanoid.gba` | @rkanoid 2.80 | [benoror/gbadev](https://github.com/benoror/gbadev) (`ROMS/`) | Public domain (marked PD) |
| `cebelix.gba` | Cebelix | [benoror/gbadev](https://github.com/benoror/gbadev) (`ROMS/`) | Historical freeware (Dreamsoft / PDRoms) |
| `dezgex.gba` | Dezgex | [benoror/gbadev](https://github.com/benoror/gbadev) (`ROMS/`) | Historical freeware (Dreamsoft / PDRoms) |
| `mystic_q.gba` | Mystic Quest demo | [benoror/gbadev](https://github.com/benoror/gbadev) (`ROMS/`) | Historical freeware (Dreamsoft / PDRoms) |
| `pik_roll.gba` | Pik Roll | [benoror/gbadev](https://github.com/benoror/gbadev) (`ROMS/`) | Historical freeware (Dreamsoft / PDRoms) |
| `ucity.gbc` | UCity | [AntonioND/ucity](https://github.com/AntonioND/ucity) | GPLv3+ (media CC BY-SA 4.0) |

The Dreamsoft demo ROMs were originally distributed as free homebrew via PDRoms
and retain their original freeware status; the `benoror/gbadev` repository's MIT
license covers its source, build scripts and modernized rebuild, not those
archival ROMs.

## Quick test links

Open the cabinet with a bundled ROM:

```text
games/gba/?rom=roms/pong.gba
games/gba/?rom=roms/rkanoid.gba
games/gba/?rom=roms/cebelix.gba
games/gba/?rom=roms/dezgex.gba
games/gba/?rom=roms/mystic_q.gba
games/gba/?rom=roms/pik_roll.gba
games/gba/?rom=roms/ucity.gbc
```

`ucity.gbc` is a Game Boy Color release and exercises the mGBA `.gbc` path.

If you add your own ROM here, do not commit commercial games. Keep it to
homebrew, public-domain releases or cartridges you dumped yourself.
