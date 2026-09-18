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

        private void Start()
        {
            string equipped = GetEquippedCardId();
            if (collector != null && bridge != null && collector.Owns(equipped))
                ApplyCardProgression(equipped);
        }

        private void Awake()
        {
            bridge = GetComponent<RPGQGMMOBridge>();
            collector = GetComponent<RPGQGGameCollector>();
            library = GetComponent<RPGQGGameLibrary>();
        }

        public int GetCardPower(string cardId)
        {
            int level = GetCardLevel(cardId);
            return Mathf.Max(0, (level - 1) * 2);
        }

        public void ApplyCardProgression(string cardId)
        {
            if (bridge == null || collector == null || !collector.Owns(cardId)) return;
            RPGQGCardProfile baseProfile = RPGQGCardProfile.FromCardId(cardId);
            int bonus = GetCardPower(cardId);
            bridge.ApplyCard(cardId);
            if (bridge.playerCombat != null)
                bridge.playerCombat.Configure(baseProfile.maxHealth + bonus * 4, baseProfile.attackPower + bonus);
            bridge.NotifyStateChanged("card:progression:" + cardId + ":" + bonus);
        }

        public int GetCardLevel(string cardId)
        {
            if (collector == null || !collector.Owns(cardId)) return 0;
            return Mathf.Max(1, PlayerPrefs.GetInt("RPGQG_CARD_LEVEL_" + cardId, 1));
        }

        public void AddCardExperience(string cardId, int amount)
        {
            if (collector == null || !collector.Owns(cardId) || amount <= 0) return;
            int level = GetCardLevel(cardId);
            int xp = PlayerPrefs.GetInt("RPGQG_CARD_XP_" + cardId, 0) + amount;
            int needed = 100 + (level - 1) * 50;
            while (xp >= needed)
            {
                xp -= needed;
                level++;
                needed = 100 + (level - 1) * 50;
            }
            PlayerPrefs.SetInt("RPGQG_CARD_LEVEL_" + cardId, level);
            PlayerPrefs.SetInt("RPGQG_CARD_XP_" + cardId, xp);
            PlayerPrefs.Save();
            if (bridge != null) bridge.NotifyStateChanged("card:level:" + cardId + ":" + level);
        }

        public string GetEquippedCardId()
        {
            return PlayerPrefs.GetString("RPGQG_EQUIPPED_CARD", bridge != null ? bridge.equippedCardId : "starter-gardien");
        }

        public bool EquipCollectedCard(string cardId)
        {
            if (collector == null || bridge == null || !collector.Owns(cardId))
                return false;

            ApplyCardProgression(cardId);
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
