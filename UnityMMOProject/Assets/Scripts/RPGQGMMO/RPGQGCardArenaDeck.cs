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
        public int rarity = 1;
        public int level = 1;
        public int experience;
        public bool unlocked = true;
        public int objectiveCount = 2;
        public string category = "Terrain";
    }

    /// <summary>
    /// Strategic arena-card deck. Cards alter the rules and generation profile
    /// of the next FreedomArena match; only gameplay metadata is persisted.
    /// </summary>
    public sealed class RPGQGCardArenaDeck : MonoBehaviour
    {
        public List<RPGQGArenaCard> cards = new List<RPGQGArenaCard>
        {
            new RPGQGArenaCard { id="cristal-capture", category="Terrain", name="Cristal", biome=1, layout=0, mode=RPGQGFreedomArenaWorldGenerator.RPGQGArenaMode.Capture, rewardMultiplier=1.15f },
            new RPGQGArenaCard { id="vide-survival", category="Event", name="Vide", biome=2, layout=2, mode=RPGQGFreedomArenaWorldGenerator.RPGQGArenaMode.Survival, enemyMultiplier=1.35f, hazardMultiplier=1.2f, rewardMultiplier=1.3f },
            new RPGQGArenaCard { id="ruines-boss", category="Boss", name="Ruines", biome=3, layout=1, mode=RPGQGFreedomArenaWorldGenerator.RPGQGArenaMode.Boss, enemyMultiplier=1.1f, rewardMultiplier=1.5f, objectiveCount=0 },
            new RPGQGArenaCard { id="nature-skirmish", category="Terrain", name="Nature", biome=4, layout=3, mode=RPGQGFreedomArenaWorldGenerator.RPGQGArenaMode.Skirmish, enemyMultiplier=0.9f, rewardMultiplier=1.05f, objectiveCount=0 }
        };

        public string EquippedArenaCardId { get; private set; } = "cristal-capture";
        public event Action<string> ArenaCardChanged;
        public event Action<string> ArenaCardProgressed;
        private readonly List<string> deck = new List<string>();
        public IReadOnlyList<string> Deck { get { return deck; } }

        private void Awake()
        {
            EquippedArenaCardId = PlayerPrefs.GetString("RPGQG_ARENA_CARD", EquippedArenaCardId);
            if (cards.Find(c => c.id == EquippedArenaCardId) == null)
                EquippedArenaCardId = cards[0].id;
            LoadAllCardProgress();
            LoadDeck();
        }

        public bool EquipArenaCard(string cardId)
        {
            RPGQGArenaCard card = cards.Find(c => c.id == cardId);
            if (card == null || !IsUnlocked(cardId)) return false;
            EquippedArenaCardId = card.id;
            PlayerPrefs.SetString("RPGQG_ARENA_CARD", EquippedArenaCardId);
            PlayerPrefs.Save();
            ArenaCardChanged?.Invoke(EquippedArenaCardId);
            return true;
        }

        public bool SetDeckCard(int slot, string cardId)
        {
            if (slot < 0 || slot >= 5 || !IsUnlocked(cardId)) return false;
            while (deck.Count < 5) deck.Add(EquippedArenaCardId);
            if (cards.Find(c => c.id == cardId) == null) return false;
            deck[slot] = cardId;
            SaveDeck();
            ArenaCardChanged?.Invoke(cardId);
            return true;
        }

        private void SaveDeck()
        {
            for (int i = 0; i < 5; i++) PlayerPrefs.SetString("FA_DECK_" + i, i < deck.Count ? deck[i] : cards[0].id);
            PlayerPrefs.Save();
        }

        private void LoadDeck()
        {
            deck.Clear();
            for (int i = 0; i < 5; i++) deck.Add(PlayerPrefs.GetString("FA_DECK_" + i, cards[0].id));
        }

        public bool AddCardExperience(string cardId, int amount)
        {
            RPGQGArenaCard card = cards.Find(c => c.id == cardId);
            if (card == null || amount <= 0) return false;
            card.experience += amount;
            int required = 100 + (card.level - 1) * 75;
            while (card.experience >= required)
            {
                card.experience -= required;
                card.level++;
                required = 100 + (card.level - 1) * 75;
            }
            SaveCardProgress(card);
            ArenaCardProgressed?.Invoke(card.id);
            return true;
        }

        public int GetCardLevel(string cardId)
        {
            RPGQGArenaCard card = cards.Find(c => c.id == cardId);
            return card == null ? 0 : card.level;
        }

        private void SaveCardProgress(RPGQGArenaCard card)
        {
            PlayerPrefs.SetInt("FA_CARD_LVL_" + card.id, card.level);
            PlayerPrefs.SetInt("FA_CARD_XP_" + card.id, card.experience);
            PlayerPrefs.Save();
        }

        private void LoadCardProgress(RPGQGArenaCard card)
        {
            card.level = Mathf.Max(1, PlayerPrefs.GetInt("FA_CARD_LVL_" + card.id, card.level));
            card.experience = Mathf.Max(0, PlayerPrefs.GetInt("FA_CARD_XP_" + card.id, card.experience));
        }

        public void LoadAllCardProgress()
        {
            foreach (RPGQGArenaCard card in cards) LoadCardProgress(card);
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
            arena.rewardMultiplier = Mathf.Clamp(arena.rewardMultiplier * card.rewardMultiplier * (1f + (card.level - 1) * 0.03f), 0.5f, 3f);
            return true;
        }

        public void UnlockCard(string cardId)
        {
            RPGQGArenaCard card = cards.Find(c => c.id == cardId);
            if (card == null) return;
            card.unlocked = true;
            PlayerPrefs.SetInt("FA_CARD_UNLOCK_" + card.id, 1);
            PlayerPrefs.Save();
        }

        public bool IsUnlocked(string cardId)
        {
            RPGQGArenaCard card = cards.Find(c => c.id == cardId);
            return card != null && (card.unlocked || PlayerPrefs.GetInt("FA_CARD_UNLOCK_" + card.id, 0) == 1);
        }

        public string BuildSynergyProfile()
        {
            int terrain = 0, events = 0, bosses = 0;
            float enemy = 1f, hazard = 1f, reward = 1f;
            for (int i = 0; i < deck.Count; i++)
            {
                RPGQGArenaCard card = cards.Find(c => c.id == deck[i]);
                if (card == null || !IsUnlocked(card.id)) continue;
                if (card.category == "Terrain") terrain++;
                else if (card.category == "Event") events++;
                else if (card.category == "Boss") bosses++;
                enemy *= Mathf.Lerp(1f, card.enemyMultiplier, 0.5f);
                hazard *= Mathf.Lerp(1f, card.hazardMultiplier, 0.5f);
                reward *= Mathf.Lerp(1f, card.rewardMultiplier, 0.5f);
            }
            string profile = "balanced";
            if (terrain >= 2 && events >= 1) profile = "hazardous-terrain";
            if (bosses >= 1 && events >= 1) profile = "boss-event";
            if (terrain >= 3) profile = "fortified-terrain";
            PlayerPrefs.SetString("FA_SYNERGY", profile);
            PlayerPrefs.Save();
            return profile + ":enemy=" + enemy.ToString("F2") + ":hazard=" + hazard.ToString("F2") + ":reward=" + reward.ToString("F2");
        }

        public bool ApplyDeckToArena()
        {
            RPGQGFreedomArenaWorldGenerator arena = FindObjectOfType<RPGQGFreedomArenaWorldGenerator>();
            if (arena == null) return false;
            RPGQGArenaCard primary = GetEquippedCard();
            if (primary == null) return false;
            ApplyToArena(arena);
            float enemy = 1f, hazard = 1f, reward = 1f;
            int terrain = 0, events = 0, bosses = 0;
            for (int i = 0; i < deck.Count; i++)
            {
                RPGQGArenaCard card = cards.Find(c => c.id == deck[i]);
                if (card == null || !IsUnlocked(card.id)) continue;
                enemy *= Mathf.Lerp(1f, card.enemyMultiplier, 0.5f);
                hazard *= Mathf.Lerp(1f, card.hazardMultiplier, 0.5f);
                reward *= Mathf.Lerp(1f, card.rewardMultiplier, 0.5f);
                if (card.category == "Terrain") terrain++;
                if (card.category == "Event") events++;
                if (card.category == "Boss") bosses++;
            }
            if (terrain >= 2) arena.coverDensity = Mathf.Clamp01(arena.coverDensity + 0.12f);
            if (events >= 1) arena.hazardDensity = Mathf.Clamp01(arena.hazardDensity * hazard * 1.1f);
            if (bosses >= 1) arena.arenaMode = RPGQGFreedomArenaWorldGenerator.RPGQGArenaMode.Boss;
            arena.enemyCount = Mathf.Clamp(Mathf.RoundToInt(arena.enemyCount * enemy), 2, arena.maxActiveEnemies);
            arena.rewardMultiplier = Mathf.Clamp(arena.rewardMultiplier * reward, 0.5f, 3f);
            BuildSynergyProfile();
            arena.Generate();
            RPGQGMMOBridge bridge = GetComponent<RPGQGMMOBridge>();
            if (bridge != null) bridge.NotifyStateChanged("arena:synergy:" + BuildSynergyProfile());
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
