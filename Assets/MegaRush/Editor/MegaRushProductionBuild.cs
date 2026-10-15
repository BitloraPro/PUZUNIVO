#if UNITY_EDITOR
using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;
using MegaRush.Content;

namespace MegaRush.Editor
{
    /// <summary>
    /// This is the only supported production build entry point.
    /// It refuses to package a missing scene, incomplete authored prefabs
    /// or a missing active Universal Render Pipeline asset.
    /// </summary>
    public static class MegaRushProductionBuild
    {
        private const string ManifestPath =
            "Assets/MegaRush/Content/MegaRushAssetManifest.asset";
        private const string ScenePath = "Assets/MegaRush/Scenes/SunsetHarbor.unity";

        [MenuItem("MegaRush/Build/Validate Unity Scene")]
        public static void ValidateScene()
        {
            ValidateRequirements();
            Debug.Log("MegaRush scene references verified. This does not certify visual fidelity, framerate or platform packaging.");
        }

        [MenuItem("MegaRush/Build/WebGL")]
        public static void BuildWeb() =>
            Build(BuildTarget.WebGL, "Builds/Web");

        [MenuItem("MegaRush/Build/Android")]
        public static void BuildAndroid() =>
            Build(BuildTarget.Android, "Builds/MegaRush-Android.apk");

        [MenuItem("MegaRush/Build/Windows 64-bit")]
        public static void BuildWindows() =>
            Build(BuildTarget.StandaloneWindows64, "Builds/Windows/MegaRush.exe");

        /// <summary>
        /// For batch mode: -executeMethod MegaRush.Editor.MegaRushProductionBuild.BuildWeb
        /// The Unity Editor must have the target module and valid license.
        /// </summary>
        private static void Build(BuildTarget target, string output)
        {
            ValidateRequirements();
            string outputDir = Path.GetDirectoryName(output);
            if (!string.IsNullOrEmpty(outputDir))
                Directory.CreateDirectory(outputDir);

            // Avoid generating artifacts outside the known output path.
            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                target = target,
                locationPathName = output,
                options = BuildOptions.None
            };

            var report = BuildPipeline.BuildPlayer(options);
            if (report == null || report.summary.result != BuildResult.Succeeded)
                throw new BuildFailedException(
                    "MegaRush " + target + " build failed. Check Unity Editor logs, asset licenses and installed platform modules.");

            Debug.Log(
                "MegaRush " + target + " build succeeded. Output: " + output +
                " | Time: " + report.summary.totalTime +
                " | Size: " + report.summary.totalSize +
                ". This is a compiled package, NOT PS5 certification or device-level visual QA.");
        }

        private static void ValidateRequirements()
        {
            var manifest = AssetDatabase.LoadAssetAtPath<MegaRushAssetManifest>(ManifestPath);
            if (manifest == null)
                throw new BuildFailedException(
                    "MegaRush asset manifest missing. Use MegaRush/Create/Select Asset Manifest and import approved authored content.");

            if (!manifest.IsReady(out string reason))
                throw new BuildFailedException("MegaRush production assets missing: " + reason);

            if (!File.Exists(ScenePath))
                throw new BuildFailedException(
                    "Approved Unity scene missing. Use MegaRush/Create Harbor Chase Scene after importing licensed assets.");

            var scene = AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath);
            if (scene == null)
                throw new BuildFailedException("Unity scene cannot be loaded.");

            if (UnityEngine.Rendering.GraphicsSettings.defaultRenderPipeline !=
                manifest.approvedUrpPipeline)
                throw new BuildFailedException("Active URP pipeline does not match the approved manifest.");

            if (EditorBuildSettings.scenes == null ||
                Array.Find(EditorBuildSettings.scenes, item =>
                    item.path == ScenePath && item.enabled) == null)
                throw new BuildFailedException(
                    "Approved SunsetHarbor.unity must be enabled in the Unity Build Settings.");
        }
    }
}
#endif
