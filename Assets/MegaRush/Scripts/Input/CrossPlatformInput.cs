using UnityEngine;
using UnityEngine.InputSystem;

namespace MegaRush.Input
{
    // The same movement actions work with keyboard, PS-style gamepads and mobile UI.
    // Touch joystick/buttons inject values via MobileControls. No second physics loop.
    public sealed class CrossPlatformInput : MonoBehaviour
    {
        public Vector2 Movement { get; private set; }
        public Vector2 LookDelta { get; private set; }
        public bool Sprint { get; private set; }
        public bool JumpPressed { get; private set; }
        public bool TrickPressed { get; private set; }
        public bool BoardPressed { get; private set; }
        public bool InteractPressed { get; private set; }
        public bool PausePressed { get; private set; }

        private MobileControls mobile;

        public void AttachMobile(MobileControls controls)
        {
            mobile = controls;
        }

        private void Update()
        {
            Vector2 move = Vector2.zero;
            Vector2 look = Vector2.zero;
            bool jump = false;
            bool trick = false;
            bool board = false;
            bool interact = false;
            bool pause = false;
            bool sprint = false;

            var keyboard = Keyboard.current;
            if (keyboard != null)
            {
                move.x += (keyboard.dKey.isPressed || keyboard.rightArrowKey.isPressed ? 1f : 0f)
                          - (keyboard.aKey.isPressed || keyboard.leftArrowKey.isPressed ? 1f : 0f);
                move.y += (keyboard.wKey.isPressed || keyboard.upArrowKey.isPressed ? 1f : 0f)
                          - (keyboard.sKey.isPressed || keyboard.downArrowKey.isPressed ? 1f : 0f);
                jump |= keyboard.spaceKey.wasPressedThisFrame;
                trick |= keyboard.kKey.wasPressedThisFrame;
                board |= keyboard.bKey.wasPressedThisFrame;
                interact |= keyboard.eKey.wasPressedThisFrame;
                pause |= keyboard.escapeKey.wasPressedThisFrame;
                sprint |= keyboard.leftShiftKey.isPressed || keyboard.rightShiftKey.isPressed;
            }

            var pad = Gamepad.current;
            if (pad != null)
            {
                var analog = pad.leftStick.ReadValue();
                if (analog.sqrMagnitude > move.sqrMagnitude) move = analog;
                look += pad.rightStick.ReadValue() * 105f * Time.unscaledDeltaTime;
                jump |= pad.buttonSouth.wasPressedThisFrame;
                trick |= pad.buttonWest.wasPressedThisFrame;
                board |= pad.rightShoulder.wasPressedThisFrame;
                interact |= pad.buttonEast.wasPressedThisFrame;
                pause |= pad.startButton.wasPressedThisFrame;
                sprint |= pad.leftShoulder.isPressed;
            }

            var mouse = Mouse.current;
            if (mouse != null && mouse.rightButton.isPressed)
                look += mouse.delta.ReadValue() * 0.15f;

            if (mobile != null)
            {
                var touch = mobile.Move;
                if (touch.sqrMagnitude > move.sqrMagnitude) move = touch;
                look += mobile.ConsumeLookDelta();
                jump |= mobile.ConsumeJump();
                trick |= mobile.ConsumeTrick();
                board |= mobile.ConsumeBoard();
                interact |= mobile.ConsumeInteract();
                pause |= mobile.ConsumePause();
                sprint |= mobile.SprintHeld;
            }

            Movement = Vector2.ClampMagnitude(move, 1f);
            LookDelta = look;
            Sprint = sprint;
            JumpPressed = jump;
            TrickPressed = trick;
            BoardPressed = board;
            InteractPressed = interact;
            PausePressed = pause;
        }
    }
}
