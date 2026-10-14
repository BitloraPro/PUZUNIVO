using UnityEngine;
using MegaRush.CameraSystem;
using MegaRush.Input;
using MegaRush.Missions;
using MegaRush.Player;
using MegaRush.Police;
using MegaRush.UI;
using MegaRush.Vehicle;

namespace MegaRush.Core
{
    public enum GameMode { Menu, FreeRoam, Chase, Escaped, Crashed, Paused }

    public sealed class GameSession : MonoBehaviour
    {
        private CrossPlatformInput controls;
        private PlayerMotor rider;
        private ThirdPersonCamera cameraRig;
        private PolicePursuit pursuer;
        private HarborFinish harbor;
        private HudPresenter hud;
        private DriveableVehicle trafficCar;
        private VehicleInteraction vehicleInteraction;
        private Vector3 spawnPoint;
        private GameMode pausedFrom;

        public GameMode State { get; private set; } = GameMode.Menu;
        public string Status { get; private set; } = "Choose HARBOR CHASE or FREE ROAM";
        public Vector3 HarborPosition => harbor != null ? harbor.transform.position : Vector3.zero;

        public void Configure(CrossPlatformInput input, PlayerMotor player,
            ThirdPersonCamera camera, PolicePursuit police, HarborFinish finish,
            HudPresenter ui, DriveableVehicle car)
        {
            controls = input;
            rider = player;
            cameraRig = camera;
            pursuer = police;
            harbor = finish;
            hud = ui;
            trafficCar = car;

            spawnPoint = rider.transform.position;
            rider.Configure(controls, cameraRig.transform);
            rider.KnockedOut += OnPlayerKnockedOut;
            pursuer.Configure(rider);
            pursuer.Activate(false);
            harbor.SetSession(this);
            cameraRig.Follow(rider.transform, controls);
            vehicleInteraction = gameObject.AddComponent<VehicleInteraction>();
            vehicleInteraction.Configure(rider, controls, cameraRig);
            if (hud != null)
            {
                if (hud.Touch != null) controls.AttachMobile(hud.Touch);
                hud.Configure(this, rider);
            }
            State = GameMode.Menu;
        }

        public void BeginHarbor() => ResetGame(true);
        public void BeginFreeRoam() => ResetGame(false);

        private void ResetGame(bool chase)
        {
            if (rider == null || pursuer == null) return;
            // Any occupied vehicle is released as part of the session reset.
            if (trafficCar != null) trafficCar.AssignDriver(null);
            rider.SetDriving(false);
            rider.ResetRider(spawnPoint);
            cameraRig.Follow(rider.transform, controls);
            pursuer.transform.position = spawnPoint - Vector3.forward * 17f + Vector3.right * 2f;
            pursuer.Activate(chase);
            State = chase ? GameMode.Chase : GameMode.FreeRoam;
            Status = chase ? "ESCAPE THE CHASE • REACH THE HARBOR" : "FREE ROAM • EXPLORE THE CITY";
            Time.timeScale = 1f;
        }

        public void TryFinishHarbor(PlayerMotor player)
        {
            if (State != GameMode.Chase || player != rider) return;
            State = GameMode.Escaped;
            pursuer.Activate(false);
            Status = "HARBOR REACHED — PRACTICE ESCAPE COMPLETED";
            // No fake XP, coins, transactions or cloud save.
        }

        private void OnPlayerKnockedOut()
        {
            if (State != GameMode.Chase && State != GameMode.FreeRoam) return;
            State = GameMode.Crashed;
            pursuer.Activate(false);
            Status = "CHASE FAILED — FREE RESTART AVAILABLE";
        }

        private void Update()
        {
            if (controls == null || !controls.PausePressed) return;
            if (State == GameMode.Paused)
            {
                State = pausedFrom;
                Status = "CHASE RESUMED";
                Time.timeScale = 1f;
                return;
            }
            if (State == GameMode.Chase || State == GameMode.FreeRoam)
            {
                pausedFrom = State;
                State = GameMode.Paused;
                Status = "PAUSED";
                Time.timeScale = 0f;
            }
        }

        private void OnDestroy()
        {
            Time.timeScale = 1f;
            if (rider != null) rider.KnockedOut -= OnPlayerKnockedOut;
        }
    }
}
