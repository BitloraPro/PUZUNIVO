#!/data/data/com.termux/files/usr/bin/bash
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
APP="$ROOT/apper-app"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Missing Node.js. Install it first in Termux: pkg install nodejs -y"
  exit 1
fi

if ! [ -f "$APP/megarush-local.html" ]; then
  echo "Local MegaRush entrypoint missing. Update the repo: git pull --ff-only"
  exit 1
fi

cd "$APP"

if ! [ -x node_modules/.bin/vite ]; then
  echo "Installing the frontend dependencies once (not using Apper credits)…"
  npm install --no-audit --no-fund
fi

echo
echo "========================================================"
echo " NEW APPER MEGARUSH 3D — LOCAL PRACTICE (NOT OLD GAME)"
echo " Open in Chrome: http://127.0.0.1:5173/megarush-local.html"
echo " Keep this Termux window open while playing."
echo " No Apper SDK, login or .env required for this practice run."
echo "========================================================"
echo
npm run megarush:local
