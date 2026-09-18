using UnityEngine;

namespace RPGQGMMO
{
    /// <summary>
    /// Unified card/MMO runtime: cards are collectible characters that directly
    /// configure the MMO avatar. Card rewards therefore feed gameplay progression.
    /// </summary>
    public sealed class RPGQGCardGameRuntime : MonoBehaviour
    {
        private RPGQGMMOBridge bridge;
        private RPGQGGameCollector collector;
        private RPGQGGameLibrary library;

        public RPGQGMMOBridge Bridge { get { return bridge; } }
        public RPGQGGameCollector Collector { get { return collector; } }

        private void Awake()
        {
            bridge = GetComponent<RPGQGMMOBridge>();
            collector = GetComponent<RPGQGGameCollector>();
            library = GetComponent<RPGQGGameLibrary>();
        }

        public bool EquipCollectedCard(string cardId)
        {
            if (collector == null || bridge == null || !collector.Owns(cardId))
                return false;

            bridge.ApplyCard(cardId);
            PlayerPrefs.SetString("RPGQG_EQUIPPED_CARD", cardId);
            PlayerPrefs.Save();
            bridge.NotifyStateChanged("card:equipped:" + cardId);
            return true;
        }

        public void RewardCardFromGameplay(string cardId, int xp)
        {
            if (collector != null) collector.Collect(cardId);
            if (bridge != null) bridge.GrantGameplayReward(Mathf.Max(1, xp));
        }

        public void RegisterGame(string gameId, string title, string platform, string emulatorProfile)
        {
            if (library != null)
                library.Register(gameId, title, platform, emulatorProfile);
        }
    }
}
