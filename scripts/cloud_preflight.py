#!/usr/bin/env python3
"""GitHub-cloud Unity build preflight. No license values or passwords are printed."""
import os
from pathlib import Path

root = Path(__file__).resolve().parent.parent
required_content = {
    "Rigged 3D environment, characters, vehicles and prefab assignments":
        root / "Assets/MegaRush/Content/MegaRushAssetManifest.asset",
    "The real playable scene assembled by Unity Editor":
        root / "Assets/MegaRush/Scenes/SunsetHarbor.unity",
    "Imported asset rights and credits":
        root / "Assets/MegaRush/Content/LICENSES.md",
}
missing = [label + " (" + str(path.relative_to(root)) + ")"
           for label, path in required_content.items() if not path.is_file()]

has_personal = bool(os.getenv("UNITY_LICENSE"))
has_professional = bool(os.getenv("UNITY_SERIAL"))
has_login = bool(os.getenv("UNITY_EMAIL")) and bool(os.getenv("UNITY_PASSWORD"))
if not (has_personal or has_professional):
    missing.append("Authorized Unity license (GitHub secret UNITY_LICENSE or UNITY_SERIAL)")
if not has_login:
    missing.append("Authorized Unity account access (GitHub secrets UNITY_EMAIL and UNITY_PASSWORD)")

valid_targets = ("WebGL", "Android", "StandaloneWindows64")
target = os.getenv("BUILD_PLATFORM", "WebGL")
if target not in valid_targets:
    missing.append("Supported build target")

ready = not missing
summary = [
    "# MegaRush cloud build preflight",
    "",
    "**Target:** " + target,
    "**Status:** " + ("READY to attempt Unity compile" if ready else "BLOCKED — not an actual game build"),
    "",
]
if missing:
    summary.append("Missing prerequisites:")
    summary.extend("- " + line for line in missing)
else:
    summary.extend([
        "All source-presence prerequisites available. Unity compilation and device QA still need to succeed.",
        "The Unity Editor validation will also inspect actual prefab references and the URP pipeline.",
    ])
summary.append("")
summary.append(
    "Source-only CI is **not** proof of playable Web/Android/Windows/PS5 builds."
)

for line in summary:
    print(line)
if os.getenv("GITHUB_STEP_SUMMARY"):
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf8") as stream:
        stream.write("\n".join(summary) + "\n")
if os.getenv("GITHUB_OUTPUT"):
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf8") as stream:
        stream.write("ready=" + ("true" if ready else "false") + "\n")
