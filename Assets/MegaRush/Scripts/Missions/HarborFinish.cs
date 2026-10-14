using UnityEngine;
using MegaRush.Player;
using MegaRush.Core;

namespace MegaRush.Missions
{
    [RequireComponent(typeof(Collider))]
    public sealed class HarborFinish : MonoBehaviour
    {
        private GameSession session;

        public void SetSession(GameSession value) => session = value;

        private void OnTriggerEnter(Collider other)
        {
            if (session == null) return;
            PlayerMotor rider = other.GetComponentInParent<PlayerMotor>();
            if (rider != null) session.TryFinishHarbor(rider);
        }
    }
}
