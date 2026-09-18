using System;
using System.Collections.Generic;
using UnityEngine;

namespace RPGQGMMO
{
    [Serializable]
    public class RPGQGArenaCard
    {
        public string id;
        public string name;
        public int biome;
        public int layout;
        public RPGQGFreedomArenaWorldGenerator.RPGQGArenaMode mode;
        public float enemyMultiplier = 1f;
        public float hazardMultiplier = 1f;
        public float rewardMultiplier = 1f;
        public int objectiveCount = 2;
    }

    /// <summary>
    /// Strategic arena-card deck. Cards alter the rules and generation profile
    /// of the next FreedomArena match; only gameplay metadata is persisted.
    /// </summary>
    public sealed class RPGQGCardArenaDeck : MonoBehaviour
    {
        public List<RPGQGArenaCard> cards = new List<RPGQGArenaCard>
        {
            new RPGQGArenaCard { id="cristal-capture", name="Cristal", biome=1, layout=0, mode=RPGQGFreedomArenaWorldGenerator.RPGQGArenaMode.Capture, rewardMultiplier=1.15f },
            new RPGQGArenaCard { id="vide-survival", name="Vide", biome=2, layout=2, mode=RPGQGFreedomArenaWorldGenerator.RPGQGArenaMode.Survival, enemyMultiplier=1.35f, hazardMultiplier=1.2f, rewardMultiplier=1.3f },
            new RPGQGArenaCard { id="ruines-boss", name="Ruines", biome=3, layout=1, mode=RPGQGFreedomArenaWorldGenerator.RPGQGArenaMode.Boss, enemyMultiplier=1.1f, rewardMultiplier=1.5f, objectiveCount=0 },
            new RPGQGArenaCard { id="nature-skirmish", name="Nature", biome=4, layout=3, mode=RPGQGFreedomArenaWorldGenerator.RPGQGArenaMode.Skirmish, enemyMultiplier=0.9f, rewardMultiplier=1.05f, objectiveCount=0 }
        };

        public string EquippedArenaCardId { get; private set; } = "cristal-capture";
        public event Action<string> ArenaCardChanged;

        private void Awake()
        {
            EquippedArenaCardId = PlayerPrefs.GetString("RPGQG_ARENA_CARD", EquippedArenaCardId);
            if (cards.Find(c => c.id == EquippedArenaCardId) == null)
                EquippedArenaCardId = cards[0].id;
        }

        public bool EquipArenaCard(string cardId)
        {
            RPGQGArenaCard card = cards.Find(c => c.id == cardId);
            if (card == null) return false;
            EquippedArenaCardId = card.id;
            PlayerPrefs.SetString("RPGQG_ARENA_CARD", EquippedArenaCardId);
            PlayerPrefs.Save();
            ArenaCardChanged?.Invoke(EquippedArenaCardId);
            return true;
        }

        public RPGQGArenaCard GetEquippedCard()
        {
            return cards.Find(c => c.id == EquippedArenaCardId);
        }

        public bool ApplyToArena(RPGQGFreedomArenaWorldGenerator arena)
        {
            RPGQGArenaCard card = GetEquippedCard();
            if (card == null || arena == null) return false;
            arena.biomeGene = card.biome;
            arena.layoutGene = card.layout;
            arena.arenaMode = card.mode;
            arena.enemyCount = Mathf.Clamp(Mathf.RoundToInt(arena.enemyCount * card.enemyMultiplier), 2, arena.maxActiveEnemies);
            arena.hazardDensity = Mathf.Clamp01(arena.hazardDensity * card.hazardMultiplier);
            arena.rewardMultiplier = Mathf.Clamp(arena.rewardMultiplier * card.rewardMultiplier, 0.5f, 3f);
            return true;
        }

        public void ApplyAndGenerate()
        {
            RPGQGFreedomArenaWorldGenerator arena = FindObjectOfType<RPGQGFreedomArenaWorldGenerator>();
            if (arena == null) return;
            if (ApplyToArena(arena))
            {
                arena.Generate();
                if (arena.GetComponent<RPGQGMMOBridge>() != null)
                    arena.GetComponent<RPGQGMMOBridge>().NotifyStateChanged("arena:card:" + EquippedArenaCardId);
            }
        }
    }
}
