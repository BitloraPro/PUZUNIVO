using UnityEngine;

namespace MegaRush.Police
{
    /// <summary>
    /// Moves an IMPORTED 3D helicopter during an active Harbor pursuit.
    /// The mesh, propellers, spotlight and materials must come from a
    /// licensed, artist-authored asset; no primitive or static impostor.
    /// </summary>
    public sealed class PursuitHelicopter : MonoBehaviour
    {
        [Header("Optional references inside the licensed helicopter prefab")]
        [SerializeField] private Transform mainRotor;
        [SerializeField] private Transform tailRotor;
        [SerializeField] private Transform searchlightPivot;
        [SerializeField] private Light searchlight;
        [Header("Actual flight behavior")]
        [SerializeField, Min(4f)] private float targetAltitude = 25f;
        [SerializeField, Min(5f)] private float orbitRadius = 18f;
        [SerializeField, Min(1f)] private float followSpeed = 17f;
        [SerializeField, Range(0.05f, 1.5f)] private float orbitSpeed = 0.26f;
        [SerializeField, Min(0f)] private float rotorDegreesPerSecond = 1320f;
        [SerializeField, Min(0f)] private float hoverOscillation = 0.75f;
        [SerializeField] private float turnResponsiveness = 3.5f;

        private Transform rider;
        private Vector3 initialPosition;
        private bool active;
        private float orbitTime;

        public bool Active => active;

        public void Configure(Transform target)
        {
            rider = target;
            initialPosition = transform.position;
            orbitTime = 0f;
            Activate(false);
        }

        public void Activate(bool enabled)
        {
            if (enabled && rider == null)
            {
                Debug.LogWarning("MegaRush helicopter has no rider target.");
                enabled = false;
            }

            if (enabled && !active)
            {
                orbitTime = 0f;
                // Start airborne behind the player, without an unrealistic
                // teleport across active gameplay frames.
                transform.position = rider.position
                    + new Vector3(-orbitRadius, targetAltitude, -orbitRadius);
            }

            active = enabled;
            if (searchlight != null) searchlight.enabled = enabled;
            gameObject.SetActive(enabled);
        }

        private void Update()
        {
            if (!active || rider == null) return;

            float dt = Time.deltaTime;
            orbitTime += dt * orbitSpeed;
            float lateral = Mathf.Cos(orbitTime) * orbitRadius;
            float trailing = -Mathf.Abs(Mathf.Sin(orbitTime) * orbitRadius);
            float desiredY = rider.position.y + targetAltitude
                + Mathf.Sin(orbitTime * 3.1f) * hoverOscillation;
            Vector3 destination = rider.position
                + new Vector3(lateral, 0f, trailing);
            destination.y = desiredY;

            transform.position = Vector3.MoveTowards(
                transform.position, destination, followSpeed * dt);

            Vector3 direction = rider.position - transform.position;
            if (direction.sqrMagnitude > 1f)
            {
                Quaternion look = Quaternion.LookRotation(direction.normalized, Vector3.up);
                transform.rotation = Quaternion.Slerp(
                    transform.rotation, look,
                    1f - Mathf.Exp(-turnResponsiveness * dt));
            }

            if (mainRotor != null)
                mainRotor.Rotate(Vector3.up, rotorDegreesPerSecond * dt, Space.Self);
            if (tailRotor != null)
                tailRotor.Rotate(Vector3.right, rotorDegreesPerSecond * 1.45f * dt, Space.Self);
            if (searchlightPivot != null)
            {
                Vector3 beam = rider.position - searchlightPivot.position;
                if (beam.sqrMagnitude > 0.25f)
                    searchlightPivot.rotation = Quaternion.LookRotation(beam.normalized, Vector3.up);
            }
        }
    }
}
