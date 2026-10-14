#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using MegaRush.Content;
using MegaRush.Core;
using MegaRush.Player;
using MegaRush.Police;
using MegaRush.Missions;
using MegaRush.Input;
using MegaRush.CameraSystem;
using MegaRush.Vehicle;
using MegaRush.UI;
using MegaRush.Rendering;

namespace MegaRush.Editor
{
    public static class MegaRushSceneAuthoring
    {
        private const string AssetFolder = "Assets/MegaRush/Content";
        private const string AssetPath = AssetFolder + "/MegaRushAssetManifest.asset";
        private const string SceneFolder = "Assets/MegaRush/Scenes";
        private const string ScenePath = SceneFolder + "/SunsetHarbor.unity";

        [MenuItem("MegaRush/Create/Select Asset Manifest")]
        public static void CreateManifest()
        {
            Directory.CreateDirectory(AssetFolder);
            AssetDatabase.Refresh();
            var manifest = AssetDatabase.LoadAssetAtPath<MegaRushAssetManifest>(AssetPath);
            if (manifest == null)
            {
                manifest = ScriptableObject.CreateInstance<MegaRushAssetManifest>();
                AssetDatabase.CreateAsset(manifest, AssetPath);
                AssetDatabase.SaveAssets();
            }
            Selection.activeObject = manifest;
            EditorGUIUtility.PingObject(manifest);
            Debug.Log("MegaRush: fill all fields with properly licensed detailed prefabs.");
        }

        [MenuItem("MegaRush/Create Harbor Chase Scene")]
        public static void BuildScene()
        {
            var manifest = AssetDatabase.LoadAssetAtPath<MegaRushAssetManifest>(AssetPath);
            if (manifest == null)
            {
                Debug.LogError("Create the asset manifest first. No fake low-poly fallback scene will be generated.");
                return;
            }
            if (!manifest.IsReady(out string error))
            {
                Debug.LogError("MegaRush blocked: " + error);
                Selection.activeObject = manifest;
                return;
            }
            if (File.Exists(ScenePath))
            {
                Debug.LogError("Scene already exists. Edit the existing SunsetHarbor scene; automatic overwrite is disabled.");
                return;
            }
            Directory.CreateDirectory(SceneFolder);
            AssetDatabase.Refresh();

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            Instantiate(manifest.cityEnvironmentPrefab, "Coastal City — authored environment", Vector3.zero);
            var playerObject = Instantiate(manifest.riggedRiderPrefab, "Rider", new Vector3(0, 0, -75));
            var motor = playerObject.GetComponent<PlayerMotor>() ?? playerObject.AddComponent<PlayerMotor>();
            if (playerObject.GetComponent<CharacterController>() == null)
                playerObject.AddComponent<CharacterController>();

            var skateboard = Instantiate(manifest.skateboardPrefab, "Skateboard", playerObject.transform.position);
            skateboard.transform.SetParent(playerObject.transform, true);

            var carObject = Instantiate(manifest.policeCarPrefab, "Police Pursuer", new Vector3(2, 0, -90));
            var police = carObject.GetComponent<PolicePursuit>() ?? carObject.AddComponent<PolicePursuit>();
            var heli = Instantiate(manifest.policeHelicopterPrefab, "Pursuit Helicopter", new Vector3(-28, 38, -70));

            var trafficObject = Instantiate(manifest.drivableTrafficCarPrefab, "Traffic Car", new Vector3(8, 0, -58));
            var traffic = trafficObject.GetComponent<DriveableVehicle>() ?? trafficObject.AddComponent<DriveableVehicle>();
            if (trafficObject.GetComponent<Rigidbody>() == null) trafficObject.AddComponent<Rigidbody>();

            var harborObject = Instantiate(manifest.harborFinishPrefab, "Harbor Finish", new Vector3(0, 0, 112));
            var finish = harborObject.GetComponent<HarborFinish>() ?? harborObject.AddComponent<HarborFinish>();
            var collider = harborObject.GetComponent<Collider>();
            if (collider == null) collider = harborObject.AddComponent<SphereCollider>();
            collider.isTrigger = true;

            var cameraObject = new GameObject("Third Person Camera");
            cameraObject.tag = "MainCamera";
            cameraObject.AddComponent<Camera>();
            cameraObject.AddComponent<AudioListener>();
            var camera = cameraObject.AddComponent<ThirdPersonCamera>();

            var uiObject = Instantiate(manifest.gameplayHudPrefab, "MegaRush UI", Vector3.zero);
            var hud = uiObject.GetComponentInChildren<HudPresenter>(true);
            if (hud == null)
            {
                Debug.LogError("HUD prefab is missing HudPresenter. Assign UI components before playing.");
                return;
            }

            var runtime = new GameObject("MegaRush Session");
            var input = runtime.AddComponent<CrossPlatformInput>();
            var session = runtime.AddComponent<GameSession>();
            runtime.AddComponent<MobileQualityController>();
            session.Configure(input, motor, camera, police, finish, hud, traffic);

            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[]
            {
                new EditorBuildSettingsScene(ScenePath, true)
            };
            Selection.activeObject = AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath);
            Debug.Log("MegaRush Sunset Harbor scene assembled from imported prefabs. Verify rig, collisions, camera, HUD and lighting.");
        }

        private static GameObject Instantiate(GameObject prefab, string label, Vector3 position)
        {
            var instance = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
            instance.name = label;
            instance.transform.position = position;
            return instance;
        }
    }
}
#endif
