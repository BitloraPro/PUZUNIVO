using UnityEngine;
using MegaRush.Input;
using MegaRush.Player;
using MegaRush.CameraSystem;

namespace MegaRush.Vehicle
{
    public sealed class VehicleInteraction : MonoBehaviour
    {
        [SerializeField] private float accessRadius = 3.8f;
        [SerializeField] private LayerMask vehicleMask = ~0;

        private PlayerMotor player;
        private CrossPlatformInput controls;
        private ThirdPersonCamera cameraRig;
        private DriveableVehicle driving;

        public void Configure(PlayerMotor rider, CrossPlatformInput input, ThirdPersonCamera camera)
        {
            player = rider;
            controls = input;
            cameraRig = camera;
        }

        private void Update()
        {
            if (player == null || controls == null || !controls.InteractPressed) return;
            if (driving != null)
            {
                Transform exit = driving.ExitMarker;
                driving.AssignDriver(null);
                player.SetDriving(false);
                player.transform.position = exit.position + exit.right * 2f + Vector3.up;
                cameraRig?.Follow(player.transform, controls);
                driving = null;
                return;
            }

            Collider[] contacts = Physics.OverlapSphere(
                player.transform.position, accessRadius, vehicleMask,
                QueryTriggerInteraction.Ignore);
            DriveableVehicle nearest = null;
            float best = float.PositiveInfinity;
            foreach (var contact in contacts)
            {
                var car = contact.GetComponentInParent<DriveableVehicle>();
                if (car == null || car.Occupied) continue;
                float dist = Vector3.Distance(car.transform.position, player.transform.position);
                if (dist >= best) continue;
                best = dist;
                nearest = car;
            }
            if (nearest == null) return;
            driving = nearest;
            player.SetDriving(true);
            driving.AssignDriver(controls);
            cameraRig?.Follow(driving.transform, controls);
        }
    }
}
