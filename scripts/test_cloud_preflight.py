#!/usr/bin/env python3
"""Standalone unit smoke test for preflight, no Unity Editor/license needed."""
from pathlib import Path
import os
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parent.parent
gate = root / "scripts/cloud_preflight.py"
with tempfile.TemporaryDirectory() as folder:
    output = Path(folder) / "result"
    env = os.environ.copy()
    env.update({
        "GITHUB_OUTPUT": str(output),
        "UNITY_LICENSE": "",
        "UNITY_SERIAL": "",
        "UNITY_EMAIL": "",
        "UNITY_PASSWORD": "",
        "BUILD_PLATFORM": "WebGL",
    })
    result = subprocess.run(
        [sys.executable, str(gate)],
        env=env,
        cwd=root,
        capture_output=True,
        text=True,
        check=True,
    )
    assert "BLOCKED" in result.stdout
    assert "UNITY_LICENSE or UNITY_SERIAL" in result.stdout
    assert "SunsetHarbor.unity" in result.stdout
    assert output.read_text().strip() == "ready=false"
print("Cloud preflight fail-closed check passed; no Unity compiler was invoked.")
