using UnityEngine;

namespace MegaRush.Rendering
{
    public sealed class MobileQualityController : MonoBehaviour
    {
        [SerializeField, Range(0.6f, 1f)] private float mobileResolutionScale = 0.82f;
        [SerializeField] private int desktopTargetFps = 60;

        private void Awake()
        {
            bool mobile = Application.isMobilePlatform;
            bool web = Application.platform == RuntimePlatform.WebGLPlayer;
            QualitySettings.vSyncCount = 0;
            Application.targetFrameRate = mobile ? 45 : desktopTargetFps;
            if (mobile || web)
            {
                ScalableBufferManager.ResizeBuffers(mobileResolutionScale, mobileResolutionScale);
                QualitySettings.shadowDistance = Mathf.Min(QualitySettings.shadowDistance, 45f);
                QualitySettings.antiAliasing = 2;
            }
        }
    }
}
