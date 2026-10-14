using UnityEngine;
using MegaRush.Player;

namespace MegaRush.Police
{
    // A world-space vehicle pursuer. Vehicle meshes/animations come from imported prefabs.
    public sealed class PolicePursuit : MonoBehaviour
    {
        [SerializeField, Min(1f)] private float pursuitSpeed = 16f;
        [SerializeField, Min(1f)] private float turnRate = 3.2f;
        [SerializeField] private float contactRadius = 2.1f;
        [SerializeField] private LayerMask streetCollisionMask = ~0;
        [SerializeField] private float followDistance = 3f;

        private PlayerMotor target;
        private bool active;

        public bool Active => active;

        public void Configure(PlayerMotor rider) => target = rider;
        public void Activate(bool value)
        {
            active = value;
            gameObject.SetActive(value);
        }

        private void FixedUpdate()
        {
            if (!active || target == null) return;
            Vector3 displacement = target.transform.position - transform.position;
            displacement.y = 0f;
            float distance = displacement.magnitude;
            if (distance < 0.01f) return;

            Vector3 direction = displacement / distance;
            Quaternion aim = Quaternion.LookRotation(direction);
            transform.rotation = Quaternion.Slerp(transform.rotation, aim,
                1f - Mathf.Exp(-turnRate * Time.fixedDeltaTime));

            float travel = Mathf.Min(
                pursuitSpeed * Time.fixedDeltaTime, Mathf.Max(0f, distance - followDistance));
            Vector3 proposed = transform.position + transform.forward * travel;
            Vector3 probe = transform.position + Vector3.up * 0.9f;
            if (!Physics.Raycast(probe, transform.forward, travel + 1.6f,
                    streetCollisionMask, QueryTriggerInteraction.Ignore))
                transform.position = proposed;

            if (distance <= contactRadius) target.ApplyDamage(1);
        }
    }
}
