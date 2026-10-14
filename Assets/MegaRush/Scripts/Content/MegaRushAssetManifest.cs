using UnityEngine;

namespace MegaRush.Content
{
    [CreateAssetMenu(menuName = "MegaRush/Approved Visual Asset Manifest", fileName = "MegaRushAssetManifest")]
    public sealed class MegaRushAssetManifest : ScriptableObject
    {
        [Header("Licensed, detailed, artist-authored source prefabs ONLY")]
        public GameObject cityEnvironmentPrefab;
        public GameObject riggedRiderPrefab;
        public GameObject skateboardPrefab;
        public GameObject policeCarPrefab;
        public GameObject policeHelicopterPrefab;
        public GameObject drivableTrafficCarPrefab;
        public GameObject harborFinishPrefab;
        public GameObject gameplayHudPrefab;

        public bool IsReady(out string reason)
        {
            if (!cityEnvironmentPrefab) return Missing("City environment", out reason);
            if (!riggedRiderPrefab) return Missing("Rigged rider", out reason);
            if (!skateboardPrefab) return Missing("Skateboard", out reason);
            if (!policeCarPrefab) return Missing("Police car", out reason);
            if (!policeHelicopterPrefab) return Missing("Police helicopter", out reason);
            if (!drivableTrafficCarPrefab) return Missing("Drivable traffic car", out reason);
            if (!harborFinishPrefab) return Missing("Harbor checkpoint", out reason);
            if (!gameplayHudPrefab) return Missing("HUD", out reason);
            reason = string.Empty;
            return true;
        }

        private static bool Missing(string field, out string reason)
        {
            reason = "Import and assign a licensed high-detail " + field + " prefab.";
            return false;
        }
    }
}
