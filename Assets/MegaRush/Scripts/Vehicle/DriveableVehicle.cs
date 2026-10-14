using UnityEngine;
using MegaRush.Input;

namespace MegaRush.Vehicle
{
    [RequireComponent(typeof(Rigidbody))]
    public sealed class DriveableVehicle : MonoBehaviour
    {
        [SerializeField] private float engineAcceleration = 10f;
        [SerializeField] private float topSpeed = 27f;
        [SerializeField] private float steering = 62f;
        [SerializeField] private Transform exitMarker;
        private Rigidbody body;
        private CrossPlatformInput controls;
        private bool occupied;

        public bool Occupied => occupied;
        public Transform ExitMarker => exitMarker != null ? exitMarker : transform;

        private void Awake()
        {
            body = GetComponent<Rigidbody>();
            body.interpolation = RigidbodyInterpolation.Interpolate;
        }

        public void AssignDriver(CrossPlatformInput input)
        {
            controls = input;
            occupied = input != null;
        }

        private void FixedUpdate()
        {
            if (!occupied || controls == null) return;

            Vector2 stick = controls.Movement;
            float forwardSpeed = Vector3.Dot(body.linearVelocity, transform.forward);
            if (Mathf.Abs(forwardSpeed) < topSpeed || Mathf.Sign(forwardSpeed) != Mathf.Sign(stick.y))
                body.AddForce(transform.forward * (stick.y * engineAcceleration), ForceMode.Acceleration);

            float steeringStrength = Mathf.Clamp01(body.linearVelocity.magnitude / 2f);
            float yaw = stick.x * steering * steeringStrength * Time.fixedDeltaTime;
            body.MoveRotation(body.rotation * Quaternion.Euler(0f, yaw, 0f));
        }
    }
}
