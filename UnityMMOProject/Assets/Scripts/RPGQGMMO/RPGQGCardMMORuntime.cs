using System;
using UnityEngine;

namespace RPGQGMMO
{
    [Serializable]
    public struct RPGQGCardClass
    {
        public string id;
        public string name;
        public int health;
        public int attack;
        public float speed;
    }

    /// <summary>
    /// Unified RPGQG Card + MMO progression rules.
    /// Cards define the playable archetype; MMO actions advance the card.
    /// </summary>
    public sealed class RPGQGCardMMORuntime : MonoBehaviour
    {
        public RPGQGCardClass[] classes = new RPGQGCardClass[]
        {
            new RPGQGCardClass { id = "gardien", name = "Gardien", health = 160, attack = 14, speed = 4.5f },
            new RPGQGCardClass { id = "mage", name = "Mage", health = 120, attack = 18, speed = 5.0f },
            new RPGQGCardClass { id = "rodeur", name = "Rôdeur", health = 140, attack = 16, speed = 5.5f }
        };

        public event Action<int> LevelChanged;
        public event Action<int> QuestCompleted;
        private RPGQGMMOBridge bridge;
        private RPGQGCardGameRuntime cards;
        private int level = 1;
        private int xp;

        public int Level { get { return level; } }
        public int XP { get { return xp; } }

        private void Awake()
        {
            bridge = GetComponent<RPGQGMMOBridge>();
            cards = GetComponent<RPGQGCardGameRuntime>();
            Load();
        }

        public void AddMMOXp(int amount)
        {
            if (amount <= 0) return;
            xp += amount;
            int required = 100 + (level - 1) * 50;
            while (xp >= required)
            {
                xp -= required;
                level++;
                required = 100 + (level - 1) * 50;
                LevelChanged?.Invoke(level);
            }
            Save();
            if (bridge != null) bridge.NotifyStateChanged("rpg:xp:" + xp + ":level:" + level);
        }

        public void CompleteQuest(string questId, int rewardXp)
        {
            if (string.IsNullOrEmpty(questId)) return;
            AddMMOXp(rewardXp);
            if (cards != null)
            {
                string cardId = cards.GetEquippedCardId();
                cards.AddCardExperience(cardId, rewardXp);
            }
            QuestCompleted?.Invoke(rewardXp);
        }

        public void Save()
        {
            PlayerPrefs.SetInt("RPGQG_RPG_LEVEL", level);
            PlayerPrefs.SetInt("RPGQG_RPG_XP", xp);
            PlayerPrefs.Save();
        }

        private void Load()
        {
            level = Mathf.Max(1, PlayerPrefs.GetInt("RPGQG_RPG_LEVEL", 1));
            xp = Mathf.Max(0, PlayerPrefs.GetInt("RPGQG_RPG_XP", 0));
        }
    }
}
