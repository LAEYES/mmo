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
        public int rarity;
        public int skillPoints;
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
        private int skillPoints;
        private int strength;
        private int defense;
        private bool skillDash;
        private bool skillBarrier;
        private bool skillUltimate;
        private float dashCooldown;
        private float barrierCooldown;
        private float ultimateCooldown;

        public int Level { get { return level; } }
        public int XP { get { return xp; } }
        public int SkillPoints { get { return skillPoints; } }
        public int Strength { get { return strength; } }
        public int Defense { get { return defense; } }
        public bool HasDash { get { return skillDash; } }
        public bool HasBarrier { get { return skillBarrier; } }
        public bool HasUltimate { get { return skillUltimate; } }
        public float DashCooldown { get { return dashCooldown; } }
        public float BarrierCooldown { get { return barrierCooldown; } }
        public float UltimateCooldown { get { return ultimateCooldown; } }

        private void Update()
        {
            dashCooldown = Mathf.Max(0f, dashCooldown - Time.deltaTime);
            barrierCooldown = Mathf.Max(0f, barrierCooldown - Time.deltaTime);
            ultimateCooldown = Mathf.Max(0f, ultimateCooldown - Time.deltaTime);
        }

        public bool TryUseSkill(string skill)
        {
            if (string.IsNullOrEmpty(skill)) return false;
            if (skill.Equals("dash", StringComparison.OrdinalIgnoreCase) && skillDash && dashCooldown <= 0f)
            {
                dashCooldown = 4f;
                bridge?.NotifyStateChanged("skill:dash:ready");
                return true;
            }
            if (skill.Equals("barrier", StringComparison.OrdinalIgnoreCase) && skillBarrier && barrierCooldown <= 0f)
            {
                barrierCooldown = 12f;
                bridge?.NotifyStateChanged("skill:barrier:ready");
                return true;
            }
            if (skill.Equals("ultimate", StringComparison.OrdinalIgnoreCase) && skillUltimate && ultimateCooldown <= 0f)
            {
                ultimateCooldown = 30f;
                bridge?.NotifyStateChanged("skill:ultimate:ready");
                return true;
            }
            return false;
        }

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
                skillPoints++;
                required = 100 + (level - 1) * 50;
                LevelChanged?.Invoke(level);
            }
            Save();
            if (bridge != null) bridge.NotifyStateChanged("rpg:xp:" + xp + ":level:" + level);
        }

        public bool SpendSkillPoint(string skill)
        {
            if (skillPoints <= 0 || string.IsNullOrEmpty(skill)) return false;
            if (skill.Equals("strength", StringComparison.OrdinalIgnoreCase)) strength++;
            else if (skill.Equals("defense", StringComparison.OrdinalIgnoreCase)) defense++;
            else if (skill.Equals("dash", StringComparison.OrdinalIgnoreCase)) skillDash = true;
            else if (skill.Equals("barrier", StringComparison.OrdinalIgnoreCase)) skillBarrier = true;
            else if (skill.Equals("ultimate", StringComparison.OrdinalIgnoreCase)) skillUltimate = true;
            else return false;
            skillPoints--;
            Save();
            if (bridge != null) bridge.NotifyStateChanged("skill:" + skill);
            return true;
        }

        public void ResetSkillCooldowns()
        {
            dashCooldown = 0f;
            barrierCooldown = 0f;
            ultimateCooldown = 0f;
        }

        public int GetRarityForCard(string cardId)
        {
            if (string.IsNullOrEmpty(cardId)) return 1;
            int hash = Mathf.Abs(cardId.GetHashCode());
            return 1 + (hash % 5);
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
            PlayerPrefs.SetInt("RPGQG_SKILL_POINTS", skillPoints);
            PlayerPrefs.SetInt("RPGQG_STRENGTH", strength);
            PlayerPrefs.SetInt("RPGQG_DEFENSE", defense);
            PlayerPrefs.SetInt("RPGQG_SKILL_DASH", skillDash ? 1 : 0);
            PlayerPrefs.SetInt("RPGQG_SKILL_BARRIER", skillBarrier ? 1 : 0);
            PlayerPrefs.SetInt("RPGQG_SKILL_ULTIMATE", skillUltimate ? 1 : 0);
            PlayerPrefs.Save();
        }

        private void Load()
        {
            level = Mathf.Max(1, PlayerPrefs.GetInt("RPGQG_RPG_LEVEL", 1));
            xp = Mathf.Max(0, PlayerPrefs.GetInt("RPGQG_RPG_XP", 0));
            skillPoints = Mathf.Max(0, PlayerPrefs.GetInt("RPGQG_SKILL_POINTS", 0));
            strength = Mathf.Max(0, PlayerPrefs.GetInt("RPGQG_STRENGTH", 0));
            defense = Mathf.Max(0, PlayerPrefs.GetInt("RPGQG_DEFENSE", 0));
            skillDash = PlayerPrefs.GetInt("RPGQG_SKILL_DASH", 0) == 1;
            skillBarrier = PlayerPrefs.GetInt("RPGQG_SKILL_BARRIER", 0) == 1;
            skillUltimate = PlayerPrefs.GetInt("RPGQG_SKILL_ULTIMATE", 0) == 1;
        }
    }
}
