using UnityEngine;
using UnityEngine.UI;
using MegaRush.Core;
using MegaRush.Player;
using MegaRush.Input;

namespace MegaRush.UI
{
    // Bind imported HUD prefab controls via inspector; all state is real local match state.
    public sealed class HudPresenter : MonoBehaviour
    {
        [SerializeField] private Text objectiveText;
        [SerializeField] private Text distanceText;
        [SerializeField] private Text healthText;
        [SerializeField] private Text speedText;
        [SerializeField] private Text statusText;
        [SerializeField] private Text coinsText;
        [SerializeField] private Text xpText;
        [SerializeField] private Button harborButton;
        [SerializeField] private Button freeRoamButton;
        [SerializeField] private Button restartButton;
        [SerializeField] private GameObject menuRoot;
        [SerializeField] private GameObject gameplayRoot;
        [SerializeField] private MobileControls mobileControls;

        private GameSession session;
        private PlayerMotor rider;

        public MobileControls Touch => mobileControls;

        public void Configure(GameSession game, PlayerMotor actor)
        {
            session = game;
            rider = actor;
            if (harborButton != null) harborButton.onClick.AddListener(session.BeginHarbor);
            if (freeRoamButton != null) freeRoamButton.onClick.AddListener(session.BeginFreeRoam);
            if (restartButton != null) restartButton.onClick.AddListener(session.BeginHarbor);
            if (coinsText != null) coinsText.text = "—";
            if (xpText != null) xpText.text = "—";
            Draw();
        }

        private void Update() => Draw();

        private void Draw()
        {
            if (session == null || rider == null) return;
            var state = session.State;
            if (menuRoot != null) menuRoot.SetActive(state != GameMode.Chase && state != GameMode.FreeRoam);
            if (gameplayRoot != null) gameplayRoot.SetActive(state == GameMode.Chase || state == GameMode.FreeRoam);
            if (objectiveText != null) objectiveText.text = state == GameMode.Chase
                ? "ESCAPE THE CHASE" : state == GameMode.FreeRoam ? "EXPLORE SUNSET CITY" : state.ToString().ToUpperInvariant();
            if (distanceText != null) distanceText.text = state == GameMode.Chase
                ? Mathf.CeilToInt(Vector3.Distance(rider.transform.position, session.HarborPosition)) + " m TO HARBOR"
                : string.Empty;
            if (healthText != null) healthText.text = "HEARTS " + rider.Hearts + "/3";
            if (speedText != null) speedText.text = Mathf.RoundToInt(rider.Speed * 3.6f) + " KM/H";
            if (statusText != null) statusText.text = session.Status;
        }
    }
}
