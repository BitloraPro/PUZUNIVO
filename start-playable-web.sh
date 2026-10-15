#!/data/data/com.termux/files/usr/bin/bash
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$ROOT/playable-web"
if ! command -v npm >/dev/null 2>&1; then
 echo "Install Node.js in Termux: pkg install nodejs -y"
 exit 1
fi
if [ ! -x node_modules/.bin/vite ]; then
 echo "Installing the new standalone browser game's dependencies …"
 npm install --no-audit --no-fund
fi
echo
echo "MEGARUSH NEW BROWSER GAME — NOT THE OLD NODE / UNITY EDITOR"
echo "OPEN CHROME: http://127.0.0.1:5173/"
echo "KEEP TERMUX RUNNING. Turn your phone sideways for a wide view."
echo
npm run dev
