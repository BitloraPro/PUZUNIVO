using UnityEngine;
using MegaRush.Input;

namespace MegaRush.Player
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class PlayerMotor : MonoBehaviour
    {
        [SerializeField, Min(1f)] private float walkSpeed = 5.5f;
        [SerializeField, Min(1f)] private float skateSpeed = 11f;
        [SerializeField, Min(1f)] private float sprintMultiplier = 1.4f;
        [SerializeField, Min(1f)] private float acceleration = 10f;
        [SerializeField] private float jumpHeight = 1.6f;
        [SerializeField] private float gravity = -22f;
        [SerializeField] private Transform modelRoot;
        [SerializeField] private Animator characterAnimator;
        [SerializeField] private GameObject skateboardVisual;

        private CharacterController controller;
        private CrossPlatformInput controls;
        private Transform cameraSource;
        private Vector3 velocity;
        private Vector3 horizontal;
        private float damageCooldown;
        private bool onBoard = true;
        private int hearts = 3;

        public int Hearts => hearts;
        public bool OnBoard => onBoard;
        public float Speed => new Vector3(horizontal.x, 0f, horizontal.z).magnitude;
        public bool Driving { get; private set; }
        public event System.Action<int> HealthChanged;
        public event System.Action KnockedOut;

        private void Awake()
        {
            controller = GetComponent<CharacterController>();
            if (skateboardVisual != null) skateboardVisual.SetActive(onBoard);
        }

        public void Configure(CrossPlatformInput input, Transform followCamera)
        {
            controls = input;
            cameraSource = followCamera;
        }

        public void SetDriving(bool driving)
        {
            Driving = driving;
            controller.enabled = !driving;
            if (modelRoot != null) modelRoot.gameObject.SetActive(!driving);
            if (skateboardVisual != null) skateboardVisual.SetActive(!driving && onBoard);
            if (!driving) { velocity = Vector3.zero; horizontal = Vector3.zero; }
        }

        public void AttachSkateboard(GameObject visual)
        {
            skateboardVisual = visual;
            if (skateboardVisual != null) skateboardVisual.SetActive(!Driving && onBoard);
        }

        public void ToggleBoard()
        {
            if (Driving) return;
            onBoard = !onBoard;
            if (skateboardVisual != null) skateboardVisual.SetActive(onBoard);
        }

        public bool ApplyDamage(int count)
        {
            if (damageCooldown > 0f || hearts <= 0) return false;
            hearts = Mathf.Max(0, hearts - Mathf.Max(1, count));
            damageCooldown = 2.2f;
            HealthChanged?.Invoke(hearts);
            if (hearts == 0) KnockedOut?.Invoke();
            return true;
        }

        public void ResetRider(Vector3 spawn)
        {
            Driving = false;
            controller.enabled = false;
            transform.position = spawn;
            controller.enabled = true;
            hearts = 3;
            velocity = Vector3.zero;
            horizontal = Vector3.zero;
            damageCooldown = 3f;
            HealthChanged?.Invoke(hearts);
        }

        private void Update()
        {
            damageCooldown = Mathf.Max(0f, damageCooldown - Time.deltaTime);
            if (Driving || controls == null || !controller.enabled) return;
            if (controls.BoardPressed) ToggleBoard();

            Vector2 stick = controls.Movement;
            Vector3 forward = cameraSource != null ? cameraSource.forward : Vector3.forward;
            Vector3 right = cameraSource != null ? cameraSource.right : Vector3.right;
            forward.y = 0f;
            right.y = 0f;
            forward.Normalize();
            right.Normalize();

            Vector3 direction = Vector3.ClampMagnitude(right * stick.x + forward * stick.y, 1f);
            float baseSpeed = onBoard ? skateSpeed : walkSpeed;
            float targetSpeed = baseSpeed * (controls.Sprint ? sprintMultiplier : 1f);
            horizontal = Vector3.MoveTowards(horizontal, direction * targetSpeed, acceleration * Time.deltaTime);

            if (controller.isGrounded && velocity.y < 0f) velocity.y = -2f;
            if (controls.JumpPressed && controller.isGrounded)
                velocity.y = Mathf.Sqrt(jumpHeight * -2f * gravity);
            velocity.y += gravity * Time.deltaTime;

            controller.Move((horizontal + Vector3.up * velocity.y) * Time.deltaTime);

            if (direction.sqrMagnitude > 0.04f && modelRoot != null)
                modelRoot.rotation = Quaternion.Slerp(
                    modelRoot.rotation,
                    Quaternion.LookRotation(direction, Vector3.up),
                    11f * Time.deltaTime);

            if (characterAnimator != null)
            {
                characterAnimator.SetFloat("Speed", Speed);
                characterAnimator.SetBool("Grounded", controller.isGrounded);
                characterAnimator.SetBool("Skating", onBoard);
                if (controls.TrickPressed && onBoard && controller.isGrounded)
                    characterAnimator.SetTrigger("Trick");
            }
        }
    }
}
