#!/usr/bin/env python3
"""No Unity SDK required. Static gates are NOT runtime proof."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
required = (
    "Packages/manifest.json",
    "ProjectSettings/ProjectVersion.txt",
    "Assets/MegaRush/Scripts/Core/GameSession.cs",
    "Assets/MegaRush/Scripts/Content/MegaRushAssetManifest.cs",
    "Assets/MegaRush/Scripts/Player/PlayerMotor.cs",
    "Assets/MegaRush/Scripts/Input/CrossPlatformInput.cs",
    "Assets/MegaRush/Scripts/Input/MobileControls.cs",
    "Assets/MegaRush/Scripts/Camera/ThirdPersonCamera.cs",
    "Assets/MegaRush/Scripts/Police/PolicePursuit.cs",
    "Assets/MegaRush/Scripts/Missions/HarborFinish.cs",
    "Assets/MegaRush/Scripts/Vehicle/VehicleInteraction.cs",
    "Assets/MegaRush/Scripts/Vehicle/DriveableVehicle.cs",
    "Assets/MegaRush/Scripts/UI/HudPresenter.cs",
    "Assets/MegaRush/Editor/MegaRushSceneAuthoring.cs",
    "Assets/MegaRush/Editor/MegaRushProductionBuild.cs",
    "Docs/MEGARUSH_UNITY_ONE_SHOT_MASTER_BRIEF.md",
    "Docs/NO_PC_CLOUD_WORKFLOW.md",
    "scripts/cloud_preflight.py",
    ".github/workflows/unity-cloud-build.yml",
)
for pathname in required:
    assert (root / pathname).is_file(), f"Required Unity source missing: {pathname}"

pkg = json.loads((root / "Packages/manifest.json").read_text())
for dep in ("com.unity.inputsystem", "com.unity.render-pipelines.universal"):
    assert dep in pkg["dependencies"], f"Missing Unity package {dep}"

for path in (
    "server.mjs",
    "megarush-api.mjs",
    "logic.mjs",
    "apper-app",
    "public/megarush",
    "start-megarush-local.sh",
):
    assert not (root / path).exists(), f"Legacy browser game unexpectedly present: {path}"

scene = (root / "Assets/MegaRush/Editor/MegaRushSceneAuthoring.cs").read_text()
builder = (root / "Assets/MegaRush/Editor/MegaRushProductionBuild.cs").read_text()
session = (root / "Assets/MegaRush/Scripts/Core/GameSession.cs").read_text()
manifest = (root / "Assets/MegaRush/Scripts/Content/MegaRushAssetManifest.cs").read_text()

assert "GameObject.CreatePrimitive" not in scene
assert "manifest.IsReady(out" in scene and "approvedUrpPipeline" in scene
assert "manifest.IsReady(out" in builder
assert "SunsetHarbor.unity" in builder
assert "BuildTarget.WebGL" in builder and "BuildTarget.Android" in builder
assert "BuildTarget.StandaloneWindows64" in builder
assert "BuildTarget.PS5" not in builder  # No proprietary SDK or unsupported claim
assert "[SerializeField] private PlayerMotor rider" in session
assert "private void Start() => Initialize()" in session
assert "SkinnedMeshRenderer" in manifest and "approvedUrpPipeline" in manifest

code = list((root / "Assets/MegaRush/Scripts").rglob("*.cs"))
assert len(code) >= 10
for file in code:
    text = file.read_text()
    assert "GameObject.CreatePrimitive" not in text
    assert "127.0.0.1:3000" not in text

assert not (root / "Assets/MegaRush/Scenes/SunsetHarbor.unity").exists(), (
    "Scene unexpectedly appears in GitHub; validate real Unity Editor output and asset rights."
)
print(
    "PASS: Unity project/source architecture and fail-closed Web/Android/Windows build commands. "
    "NOT TESTED: Unity compile, assets, gameplay, rendering, mobile fps, actual packages or PS5."
)
