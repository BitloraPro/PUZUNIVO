using UnityEngine;
using MegaRush.Input;

namespace MegaRush.CameraSystem
{
    public sealed class ThirdPersonCamera : MonoBehaviour
    {
        [SerializeField] private Vector3 focusOffset = new Vector3(0f, 1.45f, 0f);
        [SerializeField, Range(3f, 14f)] private float distance = 6.2f;
        [SerializeField, Range(-25f, 70f)] private float pitchDegrees = 18f;
        [SerializeField] private float yawDegrees;
        [SerializeField] private float lookSensitivity = 1f;
        [SerializeField] private LayerMask occlusionMask = ~0;
        [SerializeField] private float sphereRadius = 0.25f;

        private Transform target;
        private CrossPlatformInput controls;
        private Vector3 currentPosition;

        public void Follow(Transform follow, CrossPlatformInput input)
        {
            target = follow;
            controls = input;
            if (target == null) return;
            currentPosition = target.position - target.forward * distance + focusOffset;
        }

        private void LateUpdate()
        {
            if (target == null) return;
            if (controls != null)
            {
                yawDegrees += controls.LookDelta.x * lookSensitivity;
                pitchDegrees = Mathf.Clamp(
                    pitchDegrees - controls.LookDelta.y * lookSensitivity, -15f, 65f);
            }
            Quaternion orbit = Quaternion.Euler(pitchDegrees, yawDegrees, 0f);
            Vector3 pivot = target.position + focusOffset;
            Vector3 backwards = orbit * Vector3.back;
            float safeDistance = distance;
            if (Physics.SphereCast(pivot, sphereRadius, backwards,
                    out RaycastHit hit, distance, occlusionMask, QueryTriggerInteraction.Ignore))
                safeDistance = Mathf.Max(0.7f, hit.distance - sphereRadius);

            Vector3 desired = pivot + backwards * safeDistance;
            currentPosition = Vector3.Lerp(
                currentPosition, desired, 1f - Mathf.Exp(-11f * Time.unscaledDeltaTime));
            transform.position = currentPosition;
            transform.rotation = Quaternion.LookRotation(pivot - currentPosition, Vector3.up);
        }
    }
}
