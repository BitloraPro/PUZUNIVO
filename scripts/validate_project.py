#!/usr/bin/env python3
"""Static layout gate, NOT a substitute for Unity Editor compile or visual QA."""
from pathlib import Path
import json

root = Path(__file__).resolve().parent.parent
required = [
    "ProjectSettings/ProjectVersion.txt",
    "Packages/manifest.json",
    "Docs/ARCHITECTURE.md",
    "Docs/ASSET_REQUIREMENTS.md",
    "Assets/MegaRush/Scripts/Core/GameSession.cs",
    "Assets/MegaRush/Scripts/Content/MegaRushAssetManifest.cs",
    "Assets/MegaRush/Scripts/Input/CrossPlatformInput.cs",
    "Assets/MegaRush/Scripts/Input/MobileControls.cs",
    "Assets/MegaRush/Scripts/Player/PlayerMotor.cs",
    "Assets/MegaRush/Scripts/Police/PolicePursuit.cs",
    "Assets/MegaRush/Scripts/Camera/ThirdPersonCamera.cs",
    "Assets/MegaRush/Scripts/UI/HudPresenter.cs",
    "Assets/MegaRush/Editor/MegaRushSceneAuthoring.cs",
]
for item in required:
    assert (root / item).is_file(), "Missing required source: " + item

data = json.loads((root / "Packages/manifest.json").read_text())
assert "com.unity.render-pipelines.universal" in data["dependencies"]
assert "com.unity.inputsystem" in data["dependencies"]

for obsolete in ("server.mjs", "megarush-api.mjs", "logic.mjs",
                 "apper-app", "public/megarush", "start-megarush-local.sh"):
    assert not (root / obsolete).exists(), "Old project present: " + obsolete

scripts = list((root / "Assets/MegaRush/Scripts").rglob("*.cs"))
assert len(scripts) >= 10, "Gameplay source foundation incomplete"
for file in scripts:
    source = file.read_text()
    assert "GameObject.CreatePrimitive" not in source, "Placeholder shapes prohibited"
    assert "http://localhost:3000" not in source, "Legacy backend accidentally referenced"
print("MegaRush Unity source structure OK; 3D assets, compilation, PS5 and builds not verified.")

# Scene bindings must persist after Unity Editor SaveScene.
session = (root / "Assets/MegaRush/Scripts/Core/GameSession.cs").read_text()
assert "[SerializeField] private PlayerMotor rider" in session
assert "private void Start() => Initialize()" in session
assets = (root / "Assets/MegaRush/Scripts/Content/MegaRushAssetManifest.cs").read_text()
assert "SkinnedMeshRenderer" in assets and "approvedUrpPipeline" in assets
