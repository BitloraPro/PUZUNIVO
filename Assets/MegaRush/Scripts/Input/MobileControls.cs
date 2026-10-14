using UnityEngine;
using UnityEngine.EventSystems;

namespace MegaRush.Input
{
    // Connect UI EventTrigger pointer-down/up or your HUD prefab's touch buttons here.
    public sealed class MobileControls : MonoBehaviour
    {
        public Vector2 Move { get; private set; }
        public bool SprintHeld { get; private set; }

        private bool jump, trick, board, interact, pause;
        private Vector2 lookDelta;

        public void SetMove(Vector2 normalized) => Move = Vector2.ClampMagnitude(normalized, 1f);
        public void SetSprint(bool value) => SprintHeld = value;
        public void TapJump() => jump = true;
        public void TapTrick() => trick = true;
        public void TapBoard() => board = true;
        public void TapInteract() => interact = true;
        public void TapPause() => pause = true;
        public void AddLookDelta(Vector2 delta) => lookDelta += delta;

        public Vector2 ConsumeLookDelta()
        {
            Vector2 value = lookDelta;
            lookDelta = Vector2.zero;
            return value;
        }

        private static bool Consume(ref bool flag)
        {
            bool value = flag;
            flag = false;
            return value;
        }

        public bool ConsumeJump() => Consume(ref jump);
        public bool ConsumeTrick() => Consume(ref trick);
        public bool ConsumeBoard() => Consume(ref board);
        public bool ConsumeInteract() => Consume(ref interact);
        public bool ConsumePause() => Consume(ref pause);

        private void OnDisable()
        {
            Move = Vector2.zero;
            lookDelta = Vector2.zero;
            SprintHeld = jump = trick = board = interact = pause = false;
        }
    }

    public sealed class TouchJoystick : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler
    {
        [SerializeField] private RectTransform knob;
        [SerializeField] private MobileControls target;
        [SerializeField, Range(30f, 180f)] private float travelRadius = 78f;
        private RectTransform region;
        private int activePointer = int.MinValue;

        private void Awake() => region = transform as RectTransform;

        public void OnPointerDown(PointerEventData eventData)
        {
            if (activePointer != int.MinValue) return;
            activePointer = eventData.pointerId;
            OnDrag(eventData);
        }

        public void OnDrag(PointerEventData eventData)
        {
            if (eventData.pointerId != activePointer || region == null || target == null) return;
            if (!RectTransformUtility.ScreenPointToLocalPointInRectangle(
                    region, eventData.position, eventData.pressEventCamera, out var point)) return;
            Vector2 value = Vector2.ClampMagnitude(point / travelRadius, 1f);
            target.SetMove(value);
            if (knob != null) knob.anchoredPosition = value * travelRadius;
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            if (eventData.pointerId != activePointer) return;
            activePointer = int.MinValue;
            if (target != null) target.SetMove(Vector2.zero);
            if (knob != null) knob.anchoredPosition = Vector2.zero;
        }

        private void OnDisable()
        {
            activePointer = int.MinValue;
            if (target != null) target.SetMove(Vector2.zero);
            if (knob != null) knob.anchoredPosition = Vector2.zero;
        }
    }

    public sealed class TouchCameraLook : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler
    {
        [SerializeField] private MobileControls target;
        private int pointerId = int.MinValue;
        private Vector2 previous;

        public void OnPointerDown(PointerEventData e)
        {
            if (pointerId != int.MinValue) return;
            pointerId = e.pointerId;
            previous = e.position;
        }

        public void OnDrag(PointerEventData e)
        {
            if (pointerId != e.pointerId || target == null) return;
            target.AddLookDelta((e.position - previous) * 0.12f);
            previous = e.position;
        }

        public void OnPointerUp(PointerEventData e)
        {
            if (pointerId == e.pointerId) pointerId = int.MinValue;
        }
    }
}
