#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DIST_DIR="$ROOT_DIR/dist"

python3 - "$ROOT_DIR" "$DIST_DIR" <<'PY'
import json
import pathlib
import sys
import zipfile

root = pathlib.Path(sys.argv[1]).resolve()
dist = pathlib.Path(sys.argv[2]).resolve()
manifest_path = root / "manifest.json"

if not manifest_path.is_file():
    raise SystemExit("manifest.json is missing")

manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

if manifest.get("manifest_version") != 3:
    raise SystemExit("Chrome Web Store package must use Manifest V3")

version = str(manifest.get("version", "")).strip()
if not version:
    raise SystemExit("Manifest version is missing")

description = manifest.get("description", "")
if not isinstance(description, str) or not description.strip():
    raise SystemExit("Manifest description is missing")
if len(description) > 132:
    raise SystemExit(f"Manifest description is {len(description)} characters; Chrome allows at most 132")

required_icons = {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
}

for size, expected in required_icons.items():
    actual = manifest.get("icons", {}).get(size)
    if actual != expected:
        raise SystemExit(f"Manifest icon {size} should be {expected!r}, got {actual!r}")
    if not (root / expected).is_file():
        raise SystemExit(f"Missing required icon: {expected}")

include_roots = [
    pathlib.Path("manifest.json"),
    pathlib.Path("src"),
    pathlib.Path("rules"),
    pathlib.Path("icons"),
]

files = []
for item in include_roots:
    path = root / item
    if path.is_file():
        files.append(path)
    elif path.is_dir():
        files.extend(candidate for candidate in path.rglob("*") if candidate.is_file())
    else:
        raise SystemExit(f"Required package path is missing: {item}")

dist.mkdir(parents=True, exist_ok=True)
output = dist / f"flashframe-chrome-web-store-v{version}.zip"

with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(files):
        relative = path.relative_to(root).as_posix()
        if "/__pycache__/" in f"/{relative}/" or relative.endswith(".pyc"):
            continue
        archive.write(path, relative)

with zipfile.ZipFile(output, "r") as archive:
    names = set(archive.namelist())
    if "manifest.json" not in names:
        raise SystemExit("Packaging error: manifest.json is not at ZIP root")
    for expected in required_icons.values():
        if expected not in names:
            raise SystemExit(f"Packaging error: {expected} is missing")

print(output)
PY
