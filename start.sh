#!/usr/bin/env sh
# One command to get this site running from a fresh clone.
#
# Everything it does is also a documented npm script; what it adds is the order
# and the checks, because the two things a new clone is missing are invisible
# until something else fails: the engine submodule (an empty engine/ directory
# makes the Eleventy config throw ENOENT on the tracking data) and the
# WebAssembly build (a missing src/client/wasm makes tsc fail to resolve the
# engine module, and then the page loads but cannot analyse anything). Both are
# generated or carried rather than committed, on purpose.
#
# Nothing here installs a toolchain behind your back: the Rust target is added
# because it is a small download, and the wasm-bindgen version has to match the
# crate exactly, so the command for that is printed rather than run.
#
#   ./start.sh              check, build and serve on http://localhost:8888
#   ./start.sh --no-serve   check and build only
#   ./start.sh --dev        unoptimised WebAssembly, which builds faster
#   ./start.sh --port 9000  serve on another port
set -eu

cd "$(dirname "$0")"

PORT=8888
SERVE=yes
WASM_PROFILE=release

while [ $# -gt 0 ]; do
  case "$1" in
    --no-serve) SERVE=no ;;
    --dev) WASM_PROFILE=dev ;;
    --port) shift; PORT="${1:-8888}" ;;
    -h|--help) sed -n '2,19p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "start.sh: unknown option $1 (try --help)" >&2; exit 2 ;;
  esac
  shift
done

say() { printf '\n== %s\n' "$1"; }
die() { printf '\nstart.sh: %s\n' "$1" >&2; exit 1; }

# ---------------------------------------------------------------- Node
command -v node >/dev/null 2>&1 || die "Node is not installed. This site needs Node 24 or newer."
NODE_MAJOR=$(node --version | sed 's/^v//; s/\..*//')
[ "$NODE_MAJOR" -ge 24 ] || die "Node $(node --version) is too old. The site, the tools and the tests are TypeScript that Node runs directly by stripping types, which needs Node 24 or newer."

# ---------------------------------------------------------------- the submodule
# The analysis, every dictionary, the report schema, the default configuration
# and the tracking data all come from engine/. Without it the build cannot even
# read the number of tracked domains.
if [ ! -f engine/config/default.toml ]; then
  say "Checking out the engine submodule"
  command -v git >/dev/null 2>&1 || die "engine/ is empty and git is not installed. Clone with --recurse-submodules, or copy the engine repository into engine/."
  # No --force: it would discard uncommitted work inside engine/. If the update
  # cannot fix it, say which of the two cases this is and let the human pick.
  git submodule update --init
  [ -f engine/config/default.toml ] || die "engine/config/default.toml is still missing.
  If engine/ is empty:                 git submodule update --init --force
  If files inside engine/ were lost:   git -C engine restore ."
elif command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1 &&
     git submodule status engine 2>/dev/null | grep -qv '^ '; then
  # A pull moves the pointer without moving the submodule, and then the build
  # reads yesterday's dictionaries against today's components, which fails on a
  # missing key at best and renders the wrong words at worst. Uncommitted work in
  # engine/ is left alone: that is somebody's unpushed change, not a stale
  # checkout, and this script does not get to throw it away.
  if [ -n "$(git -C engine status --porcelain 2>/dev/null)" ]; then
    say "engine/ is not the commit this repo records, and it has uncommitted changes, so it is being left alone"
    echo "   to move it anyway, commit or stash in engine/ and run: git submodule update"
  else
    say "Moving engine/ to the commit this repo records"
    git submodule update --init
  fi
fi

# ---------------------------------------------------------------- dependencies
if [ ! -d node_modules ]; then
  say "Installing dependencies"
  npm ci
fi

# ---------------------------------------------------------------- the engine
# src/client/wasm/ is generated and gitignored, in both repositories.
if [ ! -f src/client/wasm/susbot_wasm.d.ts ]; then
  say "Building the engine for the browser"
  command -v cargo >/dev/null 2>&1 || die "The analysis is Rust compiled to WebAssembly, and cargo is not installed. Install Rust from https://rustup.rs and run this again."

  if command -v rustup >/dev/null 2>&1; then
    rustup target list --installed 2>/dev/null | grep -q '^wasm32-unknown-unknown$' || {
      echo "   adding the wasm32-unknown-unknown target"
      rustup target add wasm32-unknown-unknown
    }
  fi

  # The glue wasm-bindgen generates only loads against its own crate version.
  WANT=$(sed -n 's/^wasm-bindgen *= *"\([0-9.]*\)".*/\1/p' engine/crates/wasm/Cargo.toml | head -1)
  if command -v wasm-bindgen >/dev/null 2>&1; then
    HAVE=$(wasm-bindgen --version | awk '{print $2}')
  else
    HAVE=none
  fi
  if [ "$HAVE" != "$WANT" ]; then
    die "wasm-bindgen $WANT is needed and $HAVE is installed. Run:
    cargo install wasm-bindgen-cli --version $WANT
  wasm-opt (binaryen) is optional: the build uses it to shrink the release
  bundle and skips it when it is missing."
  fi

  if [ "$WASM_PROFILE" = dev ]; then npm run build:dev; else npm run build:wasm; fi
  [ -f src/client/wasm/susbot_wasm.d.ts ] || die "the WebAssembly build produced no types in src/client/wasm/"
fi

# ---------------------------------------------------------------- the site
say "Building the site"
npm run build:site

if [ "$SERVE" = no ]; then
  printf '\nBuilt into _site/. Serve it over HTTP, not from the file system: the page loads ES modules.\n'
  exit 0
fi

# ES modules and the WebAssembly need an HTTP origin, so opening _site/index.html
# from the file system does not work.
say "Serving _site/ on http://localhost:$PORT"
if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT" --directory _site
fi
printf '\nBuilt into _site/, but python3 is not installed to serve it. Use any static server, for example:\n  npx --yes serve _site -l %s\n' "$PORT"
