# Generates the Flash Vault cover art from games/flash/catalog.json.
# Run from the repo root: powershell -File tools/make-flash-art.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$catalogPath = Join-Path $root 'games/flash/catalog.json'
$outDir = Join-Path $root 'assets/flash'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$games = Get-Content $catalogPath -Raw | ConvertFrom-Json

function Motif([string]$slug) {
  switch ($slug) {
    'n' { return @'
<g fill="none" stroke="__ACCENT__" stroke-width="7" opacity=".8">
  <rect x="470" y="92" width="220" height="220" rx="44"/>
  <rect x="510" y="132" width="140" height="140" rx="28" opacity=".7"/>
  <rect x="550" y="172" width="60" height="60" rx="14" opacity=".55"/>
</g>
<path d="M560 250 L590 220 L620 250 M590 220 V300" fill="none" stroke="__ACCENT__" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
'@ }
    'qwop' { return @'
<g stroke="__ACCENT__" stroke-width="9" stroke-linecap="round" opacity=".9">
  <circle cx="590" cy="120" r="28" fill="none"/>
  <path d="M590 148 V235 M590 235 L540 305 M590 235 L650 290 M590 180 L530 205 M590 180 L660 150"/>
</g>
<g stroke="__ACCENT__" stroke-width="3" opacity=".28">
  <path d="M380 110 H760 M380 150 H760 M380 190 H760 M380 230 H760 M380 270 H760"/>
</g>
'@ }
    'worlds-hardest-game' { return @'
<g fill="__ACCENT__" opacity=".85">
  <rect x="500" y="105" width="42" height="42"/>
  <rect x="560" y="105" width="42" height="42" opacity=".6"/>
  <rect x="620" y="105" width="42" height="42" opacity=".35"/>
  <rect x="500" y="165" width="42" height="42" opacity=".5"/>
  <rect x="620" y="165" width="42" height="42" opacity=".8"/>
  <rect x="560" y="225" width="42" height="42" opacity=".4"/>
  <rect x="500" y="285" width="42" height="42" opacity=".7"/>
  <rect x="620" y="285" width="42" height="42" opacity=".55"/>
</g>
<g fill="none" stroke="__ACCENT__" stroke-width="5" opacity=".7">
  <path d="M420 330 L445 285 L470 330 Z M650 330 L675 285 L700 330 Z"/>
</g>
'@ }
    'bloxorz' { return @'
<g opacity=".9">
  <path d="M520 120 L610 80 L700 120 L610 160 Z" fill="__ACCENT__" opacity=".35"/>
  <path d="M520 120 L610 160 L610 260 L520 220 Z" fill="__ACCENT__" opacity=".8"/>
  <path d="M610 160 L700 120 L700 220 L610 260 Z" fill="__ACCENT__" opacity=".55"/>
  <path d="M555 170 L610 195 L610 235 L555 210 Z" fill="#070a12" opacity=".6"/>
  <path d="M610 195 L665 170 L665 210 L610 235 Z" fill="#070a12" opacity=".45"/>
</g>
<g stroke="__ACCENT__" stroke-width="2" opacity=".3">
  <path d="M430 300 H720 M430 330 H720"/>
</g>
'@ }
    'achievement-unlocked' { return @'
<g fill="none" stroke="__ACCENT__" stroke-width="7" opacity=".9">
  <path d="M540 115 H660 V190 A60 60 0 0 1 540 190 Z"/>
  <path d="M540 140 H500 A40 40 0 0 0 540 190 M660 140 H700 A40 40 0 0 1 660 190"/>
  <path d="M600 250 V285 M555 315 H645"/>
</g>
<g fill="__ACCENT__" opacity=".8">
  <path d="M600 130 L610 158 L640 158 L616 176 L625 204 L600 187 L575 204 L584 176 L560 158 L590 158 Z"/>
</g>
<g fill="__ACCENT__" opacity=".25">
  <circle cx="430" cy="120" r="6"/><circle cx="465" cy="160" r="4"/><circle cx="435" cy="205" r="5"/>
  <circle cx="720" cy="250" r="5"/><circle cx="690" cy="300" r="4"/>
</g>
'@ }
    'motherload' { return @'
<g opacity=".9">
  <path d="M560 90 L620 250 L500 250 Z" fill="__ACCENT__" opacity=".85"/>
  <path d="M545 165 L575 165 L590 205 L530 205 Z" fill="#070a12" opacity=".55"/>
  <path d="M500 250 L620 250 L650 290 L470 290 Z" fill="__ACCENT__" opacity=".4"/>
</g>
<g stroke="__ACCENT__" stroke-width="3" opacity=".3">
  <path d="M420 320 H740 M420 350 H740 M420 380 H740"/>
</g>
<g fill="__ACCENT__" opacity=".55">
  <circle cx="470" cy="335" r="6"/><circle cx="680" cy="365" r="8"/><circle cx="560" cy="390" r="5"/>
</g>
'@ }
    'interactive-buddy' { return @'
<g fill="none" stroke="__ACCENT__" stroke-width="6" opacity=".85">
  <circle cx="595" cy="190" r="95"/>
  <circle cx="560" cy="165" r="10" fill="__ACCENT__"/>
  <circle cx="630" cy="165" r="10" fill="__ACCENT__"/>
  <path d="M555 215 Q595 250 635 215" stroke-linecap="round"/>
  <path d="M595 285 V330 M550 330 H640"/>
</g>
<g fill="__ACCENT__" opacity=".25">
  <circle cx="445" cy="120" r="18"/><circle cx="720" cy="110" r="12"/><circle cx="740" cy="260" r="22"/>
  <circle cx="430" cy="270" r="10"/>
</g>
'@ }
    'age-of-war' { return @'
<g fill="__ACCENT__" opacity=".8">
  <path d="M480 300 V170 H510 V140 H540 V170 H570 V140 H600 V170 H630 V300 Z"/>
  <path d="M700 300 V210 H725 V180 H750 V210 H775 V300 Z" opacity=".55"/>
</g>
<g stroke="__ACCENT__" stroke-width="5" opacity=".7" stroke-linecap="round">
  <path d="M420 250 H640 M640 250 L610 230 M640 250 L610 270"/>
  <path d="M730 150 L700 130 M730 150 L700 170"/>
</g>
<g fill="__ACCENT__" opacity=".35">
  <rect x="480" y="300" width="150" height="14"/>
</g>
'@ }
    'bloons-td-2' { return @'
<g fill="none" stroke="__ACCENT__" stroke-width="6" opacity=".9">
  <circle cx="590" cy="190" r="105"/>
  <circle cx="590" cy="190" r="72"/>
  <circle cx="590" cy="190" r="38"/>
  <circle cx="590" cy="190" r="12" fill="__ACCENT__"/>
</g>
<g stroke="__ACCENT__" stroke-width="6" stroke-linecap="round" opacity=".8">
  <path d="M590 190 L690 105 M590 190 L485 120"/>
</g>
<g fill="__ACCENT__" opacity=".7">
  <circle cx="440" cy="300" r="10"/><circle cx="700" cy="290" r="8"/><circle cx="735" cy="140" r="7"/>
</g>
'@ }
    'learn-to-fly' { return @'
<g fill="none" stroke="__ACCENT__" stroke-width="6" opacity=".85">
  <path d="M430 310 Q560 90 720 130" stroke-dasharray="10 14"/>
  <path d="M430 310 H740"/>
</g>
<g fill="__ACCENT__" opacity=".9">
  <path d="M560 250 L610 220 L650 245 L615 275 Z"/>
  <path d="M650 245 L690 230 L675 260 Z" opacity=".7"/>
</g>
<g fill="__ACCENT__" opacity=".4">
  <circle cx="470" cy="120" r="8"/><circle cx="520" cy="150" r="5"/><circle cx="700" cy="300" r="6"/>
</g>
'@ }
    'doodle-jump' { return @'
<g fill="__ACCENT__" opacity=".8">
  <rect x="480" y="300" width="120" height="14" rx="7"/>
  <rect x="570" y="240" width="110" height="14" rx="7" opacity=".7"/>
  <rect x="650" y="180" width="100" height="14" rx="7" opacity=".5"/>
  <rect x="550" y="120" width="90" height="14" rx="7" opacity=".35"/>
</g>
<g stroke="__ACCENT__" stroke-width="8" stroke-linecap="round" fill="none">
  <path d="M620 300 V210 M620 210 L590 240 M620 210 L650 240"/>
</g>
<g fill="__ACCENT__" opacity=".25">
  <circle cx="450" cy="160" r="7"/><circle cx="730" cy="330" r="6"/><circle cx="470" cy="350" r="4"/>
</g>
'@ }
    'fancy-pants' { return @'
<g fill="none" stroke="__ACCENT__" stroke-width="7" opacity=".85" stroke-linecap="round">
  <path d="M430 310 Q500 190 570 270 T710 210"/>
  <path d="M430 340 Q520 240 600 310 T740 260" opacity=".5"/>
  <path d="M540 140 Q600 90 660 140" opacity=".65"/>
</g>
<g fill="__ACCENT__" opacity=".7">
  <circle cx="600" cy="190" r="24"/>
  <path d="M600 214 L570 280 M600 214 L630 280 M600 235 L555 255 M600 235 L645 255" stroke="__ACCENT__" stroke-width="9" stroke-linecap="round"/>
</g>
'@ }
    'riddle-school' { return @'
<g fill="none" stroke="__ACCENT__" stroke-width="7" opacity=".9">
  <rect x="500" y="100" width="150" height="240" rx="6"/>
  <circle cx="620" cy="220" r="7" fill="__ACCENT__"/>
</g>
<g fill="__ACCENT__" opacity=".8" font-family="Arial, sans-serif" font-size="130" font-weight="700">
  <text x="690" y="180">?</text>
  <text x="670" y="300" font-size="70" opacity=".55">?</text>
</g>
'@ }
    'storm-the-house' { return @'
<g fill="none" stroke="__ACCENT__" stroke-width="7" opacity=".9">
  <path d="M500 300 V180 L590 110 L680 180 V300 Z"/>
  <rect x="560" y="230" width="60" height="70"/>
  <path d="M500 180 H680"/>
</g>
<g fill="__ACCENT__" opacity=".55">
  <path d="M430 330 L455 285 L480 330 Z M690 330 L715 285 L740 330 Z"/>
</g>
<g stroke="__ACCENT__" stroke-width="5" opacity=".7" stroke-linecap="round">
  <path d="M440 220 H490 M440 250 H490 M700 220 H750 M700 250 H750"/>
</g>
'@ }
    'portal-flash' { return @'
<g fill="none" stroke="__ACCENT__" stroke-width="7" opacity=".9">
  <ellipse cx="520" cy="190" rx="55" ry="105"/>
  <ellipse cx="690" cy="190" rx="55" ry="105" opacity=".55"/>
</g>
<g fill="__ACCENT__" opacity=".7">
  <path d="M575 160 L635 160 L635 220 L575 220 Z"/>
  <path d="M590 175 L620 175 L620 205 L590 205 Z" fill="#070a12" opacity=".6"/>
</g>
<g fill="__ACCENT__" opacity=".3">
  <circle cx="460" cy="90" r="7"/><circle cx="740" cy="300" r="6"/><circle cx="470" cy="320" r="5"/>
</g>
'@ }
    'super-meat-boy' { return @'
<g opacity=".9">
  <rect x="540" y="120" width="130" height="130" rx="18" fill="__ACCENT__"/>
  <circle cx="580" cy="165" r="13" fill="#070a12"/>
  <circle cx="630" cy="165" r="13" fill="#070a12"/>
  <path d="M575 205 Q605 230 635 205" fill="none" stroke="#070a12" stroke-width="8" stroke-linecap="round"/>
  <path d="M540 250 L520 290 L560 275 L600 300 L640 275 L680 290 L660 250 Z" fill="__ACCENT__" opacity=".5"/>
</g>
<g fill="__ACCENT__" opacity=".55">
  <path d="M450 330 L470 290 L490 330 Z M700 330 L720 290 L740 330 Z"/>
</g>
'@ }
    'pandemic-2' { return @'
<g fill="none" stroke="__ACCENT__" stroke-width="6" opacity=".85">
  <circle cx="600" cy="190" r="90"/>
  <circle cx="600" cy="190" r="55" opacity=".6"/>
  <path d="M600 100 V60 M600 280 V320 M510 190 H470 M690 190 H730 M535 125 L505 95 M665 255 L695 285 M665 125 L695 95 M535 255 L505 285"/>
</g>
<g fill="__ACCENT__" opacity=".6">
  <circle cx="470" cy="330" r="8"/><circle cx="720" cy="110" r="7"/><circle cx="740" cy="290" r="5"/>
</g>
'@ }
    'papas-pizzeria' { return @'
<g opacity=".9">
  <circle cx="600" cy="190" r="105" fill="__ACCENT__" opacity=".25"/>
  <circle cx="600" cy="190" r="95" fill="none" stroke="__ACCENT__" stroke-width="7"/>
  <path d="M600 190 L680 130 A95 95 0 0 1 690 220 Z" fill="__ACCENT__" opacity=".45"/>
  <circle cx="570" cy="160" r="10" fill="__ACCENT__"/>
  <circle cx="630" cy="220" r="9" fill="__ACCENT__"/>
  <circle cx="555" cy="230" r="8" fill="__ACCENT__"/>
  <circle cx="645" cy="150" r="7" fill="__ACCENT__"/>
</g>
<g stroke="__ACCENT__" stroke-width="4" opacity=".3">
  <path d="M430 320 H740 M430 350 H740"/>
</g>
'@ }
    'duck-life' { return @'
<g fill="none" stroke="__ACCENT__" stroke-width="5" opacity=".35">
  <path d="M430 300 H740 M430 340 H740"/>
</g>
<g opacity=".9">
  <circle cx="600" cy="180" r="70" fill="__ACCENT__" opacity=".3"/>
  <circle cx="600" cy="180" r="52" fill="none" stroke="__ACCENT__" stroke-width="7"/>
  <path d="M652 180 L700 195 L652 210 Z" fill="__ACCENT__"/>
  <circle cx="620" cy="160" r="9" fill="__ACCENT__"/>
</g>
<g fill="__ACCENT__" opacity=".55">
  <circle cx="470" cy="120" r="6"/><circle cx="720" cy="280" r="8"/><circle cx="450" cy="250" r="5"/>
</g>
'@ }
    'stick-rpg' { return @'
<g fill="none" stroke="__ACCENT__" stroke-width="8" stroke-linecap="round" opacity=".9">
  <circle cx="590" cy="120" r="26"/>
  <path d="M590 146 V230 M590 230 L545 300 M590 230 L635 300 M590 175 L535 205 M590 175 L645 205"/>
</g>
<g fill="__ACCENT__" opacity=".45">
  <rect x="440" y="270" width="45" height="70"/>
  <rect x="500" y="240" width="35" height="100"/>
  <rect x="660" y="250" width="40" height="90"/>
  <rect x="715" y="220" width="30" height="120"/>
</g>
'@ }
    'rubiks-cube' { return @'
<g opacity=".95">
  <path d="M540 120 L650 75 L760 120 L650 165 Z" fill="__ACCENT__" opacity=".35"/>
  <path d="M540 120 L650 165 L650 290 L540 245 Z" fill="__ACCENT__" opacity=".75"/>
  <path d="M650 165 L760 120 L760 245 L650 290 Z" fill="__ACCENT__" opacity=".5"/>
  <g fill="#070a12" opacity=".55">
    <rect x="565" y="150" width="28" height="28"/><rect x="605" y="168" width="28" height="28"/>
    <rect x="565" y="200" width="28" height="28"/><rect x="605" y="218" width="28" height="28"/>
    <rect x="675" y="150" width="28" height="28"/><rect x="715" y="135" width="28" height="28"/>
    <rect x="675" y="200" width="28" height="28"/><rect x="715" y="185" width="28" height="28"/>
  </g>
</g>
'@ }
    'checkers' { return @'
<g opacity=".9">
  <rect x="490" y="90" width="240" height="240" fill="__ACCENT__" opacity=".18"/>
  <g fill="__ACCENT__" opacity=".55">
    <rect x="490" y="90" width="60" height="60"/><rect x="610" y="90" width="60" height="60"/>
    <rect x="550" y="150" width="60" height="60"/><rect x="670" y="150" width="60" height="60"/>
    <rect x="490" y="210" width="60" height="60"/><rect x="610" y="210" width="60" height="60"/>
    <rect x="550" y="270" width="60" height="60"/><rect x="670" y="270" width="60" height="60"/>
  </g>
  <circle cx="550" cy="150" r="20" fill="__ACCENT__"/>
  <circle cx="670" cy="270" r="20" fill="__ACCENT__"/>
</g>
'@ }
    'minesweeper' { return @'
<g fill="none" stroke="__ACCENT__" stroke-width="4" opacity=".7">
  <rect x="490" y="90" width="240" height="240"/>
  <path d="M550 90 V330 M610 90 V330 M670 90 V330 M490 150 H730 M490 210 H730 M490 270 H730"/>
</g>
<g fill="__ACCENT__" opacity=".75">
  <circle cx="520" cy="120" r="13"/><circle cx="640" cy="180" r="13"/><circle cx="580" cy="300" r="13"/>
  <path d="M520 100 V92 M520 148 V140 M500 120 H492 M548 120 H540"/>
</g>
'@ }
    'pacman' { return @'
<g fill="__ACCENT__" opacity=".9">
  <path d="M600 190 L720 120 A105 105 0 1 0 720 260 Z"/>
</g>
<g fill="__ACCENT__" opacity=".55">
  <circle cx="450" cy="190" r="9"/><circle cx="490" cy="190" r="9"/><circle cx="530" cy="190" r="9"/>
  <circle cx="740" cy="190" r="9"/>
</g>
<g fill="none" stroke="__ACCENT__" stroke-width="7" opacity=".7">
  <path d="M680 90 Q710 60 740 90 V150 Q720 170 700 150 V120 H740"/>
</g>
'@ }
    'tetris' { return @'
<g opacity=".9">
  <g fill="__ACCENT__" opacity=".85">
    <rect x="500" y="100" width="45" height="45"/><rect x="545" y="100" width="45" height="45"/>
    <rect x="590" y="100" width="45" height="45"/><rect x="590" y="145" width="45" height="45"/>
  </g>
  <g fill="__ACCENT__" opacity=".55">
    <rect x="650" y="150" width="45" height="45"/><rect x="695" y="150" width="45" height="45"/>
    <rect x="650" y="195" width="45" height="45"/><rect x="650" y="240" width="45" height="45"/>
  </g>
  <g fill="__ACCENT__" opacity=".35">
    <rect x="500" y="230" width="45" height="45"/><rect x="545" y="230" width="45" height="45"/>
    <rect x="545" y="275" width="45" height="45"/><rect x="590" y="275" width="45" height="45"/>
  </g>
</g>
'@ }
    'snake' { return @'
<g fill="none" stroke="__ACCENT__" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity=".85">
  <path d="M470 300 H560 V230 H650 V160 H730"/>
</g>
<g fill="__ACCENT__" opacity=".9">
  <circle cx="470" cy="300" r="16"/>
  <circle cx="730" cy="160" r="12"/>
  <circle cx="620" cy="110" r="10"/>
</g>
<g fill="none" stroke="__ACCENT__" stroke-width="3" opacity=".25">
  <rect x="450" y="90" width="300" height="240"/>
</g>
'@ }
    default { return '<circle cx="600" cy="200" r="90" fill="none" stroke="__ACCENT__" stroke-width="8"/>' }
  }
}

function EscapeXml([string]$value) {
  return [System.Security.SecurityElement]::Escape($value)
}

$i = 0
foreach ($game in $games) {
  $i++
  $accent = $game.accent
  $motif = (Motif $game.slug).Replace('__ACCENT__', $accent)
  $title = EscapeXml($game.title)
  $genre = EscapeXml($game.genre)
  $year = $game.year
  $index = $i.ToString('00')
  $fontSize = if ($game.title.Length -gt 20) { 40 } elseif ($game.title.Length -gt 14) { 48 } else { 58 }
  $svg = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500" role="img" aria-labelledby="title desc">
  <title id="title">$title</title>
  <desc id="desc">Flash Vault cover art for $title</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1426"/>
      <stop offset=".55" stop-color="#070a12"/>
      <stop offset="1" stop-color="#03050a"/>
    </linearGradient>
    <radialGradient id="glow" cx="72%" cy="30%" r="78%">
      <stop offset="0" stop-color="$accent" stop-opacity=".42"/>
      <stop offset=".55" stop-color="$accent" stop-opacity=".08"/>
      <stop offset="1" stop-color="$accent" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#03050a" stop-opacity="0"/>
      <stop offset=".5" stop-color="#03050a" stop-opacity=".72"/>
      <stop offset="1" stop-color="#03050a" stop-opacity=".96"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#bg)"/>
  <rect width="800" height="500" fill="url(#glow)"/>
  <g opacity=".1" stroke="$accent" stroke-width="1">
    <path d="M0 70 H800 M0 140 H800 M0 210 H800 M0 280 H800 M0 350 H800 M0 420 H800"/>
    <path d="M70 0 V500 M140 0 V500 M210 0 V500 M280 0 V500 M350 0 V500 M420 0 V500 M490 0 V500 M560 0 V500 M630 0 V500 M700 0 V500 M770 0 V500"/>
  </g>
  $motif
  <rect y="300" width="800" height="200" fill="url(#fade)"/>
  <rect x="52" y="322" width="64" height="4" fill="$accent"/>
  <text x="52" y="382" fill="#edf4ff" font-family="Segoe UI, Arial, sans-serif" font-size="$fontSize" font-weight="700" letter-spacing="-1">$title</text>
  <text x="52" y="418" fill="$accent" font-family="Consolas, monospace" font-size="15" letter-spacing="2">$($genre.ToUpper()) · $year</text>
  <text x="52" y="456" fill="#8fa3bb" font-family="Consolas, monospace" font-size="11" letter-spacing="2">WASM ARCADE · FLASH VAULT</text>
  <text x="748" y="72" fill="$accent" fill-opacity=".55" text-anchor="end" font-family="Consolas, monospace" font-size="18" letter-spacing="2">$index</text>
  <rect x="1" y="1" width="798" height="498" fill="none" stroke="$accent" stroke-opacity=".18"/>
</svg>
"@
  $path = Join-Path $outDir "$($game.slug).svg"
  Set-Content -Path $path -Value $svg -Encoding UTF8
}
Write-Host "Wrote $i covers to $outDir"
