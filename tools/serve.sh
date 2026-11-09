#!/bin/sh
# Serve the arcade over plain HTTP. WASM cannot be fetched from file:// URLs.
#
#   ./tools/serve.sh          # bind 0.0.0.0:8000, reachable on your network
#   ./tools/serve.sh 9000     # custom port
#   HOST=127.0.0.1 ./tools/serve.sh   # loopback only
#
# By default this binds to all interfaces so phones, tablets and other
# computers on the same Wi-Fi can open the arcade. The script prints the
# local, network (LAN) and public IP addresses it can discover.

set -eu
cd "$(dirname "$0")/.."

PORT="${1:-8000}"
BIND="${HOST:-0.0.0.0}"

if python3 -c 'import sys; sys.exit(0 if sys.version_info.major == 3 else 1)' >/dev/null 2>&1; then
  PYTHON=python3
elif python -c 'import sys; sys.exit(0 if sys.version_info.major == 3 else 1)' >/dev/null 2>&1; then
  PYTHON=python
else
  echo "Python 3 is required to serve the arcade (python3 or python)." >&2
  exit 1
fi

# Print non-loopback IPv4 addresses, preferring Wi-Fi/Ethernet interfaces.
lan_addresses() {
  FOUND=""
  if command -v ifconfig >/dev/null 2>&1; then
    FOUND="$(ifconfig 2>/dev/null | awk '
      /^[A-Za-z0-9_.:-]+[ \t]/ { iface = $1 }
      /inet (addr:)?[0-9]/ {
        ip = $0
        sub(/.*inet (addr:)?/, "", ip)
        sub(/[ \t].*/, "", ip)
        if (ip ~ /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/ && ip !~ /^127\./ &&
            iface !~ /^(lo|rmnet|dummy|tun|tap)/) {
          print iface, ip
        }
      }' | awk '
        $1 ~ /^(wlan|wl|eth|en|ap|br|bond)/ { print "0 " $2; next }
        { print "1 " $2 }' | sort -k1,1n -k2,2 | awk '{ print $2 }' | awk '!seen[$0]++')" || FOUND=""
  fi

  if [ -n "$FOUND" ]; then
    printf '%s\n' "$FOUND"
    return 0
  fi

  # Fallback for systems where ifconfig is unavailable or restricted.
  if command -v "$PYTHON" >/dev/null 2>&1; then
    "$PYTHON" - <<'PY' 2>/dev/null || true
import socket
ips = []
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(("8.8.8.8", 80))
    ips.append(s.getsockname()[0])
    s.close()
except OSError:
    pass
try:
    for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
        ips.append(info[4][0])
except OSError:
    pass
seen = set()
for ip in ips:
    if ip and not ip.startswith("127.") and ip not in seen:
        seen.add(ip)
        print(ip)
PY
  fi
}

public_address() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS --connect-timeout 2 --max-time 3 https://api.ipify.org 2>/dev/null || true
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- -T 3 https://api.ipify.org 2>/dev/null || true
  fi
}

echo "Arcade"
echo "  Local:    http://127.0.0.1:${PORT}/"

if [ "$BIND" = "127.0.0.1" ] || [ "$BIND" = "localhost" ]; then
  echo "  Bind:     ${BIND} (this device only)"
  echo
  echo "  Set HOST=0.0.0.0 or omit HOST to share on your network."
else
  IPS="$(lan_addresses || true)"
  if [ -n "$IPS" ]; then
    printf '%s\n' "$IPS" | while IFS= read -r ip; do
      [ -n "$ip" ] && echo "  Network:  http://${ip}:${PORT}/"
    done
  else
    echo "  Network:  http://<this-device-ip>:${PORT}/"
  fi

  PUB="$(public_address || true)"
  if [ -n "$PUB" ]; then
    echo "  Public:   http://${PUB}:${PORT}/ (needs router port-forwarding)"
  fi

  echo "  Bind:     ${BIND}"
  echo
  echo "  On another device on the same Wi-Fi, open a Network URL above."
  echo "  The Public URL only works from the internet if your router forwards"
  echo "  port ${PORT} to this device; it is not needed on the same network."
fi

echo
echo "Press Ctrl-C to stop."
exec "$PYTHON" -m http.server "$PORT" --bind "$BIND"
