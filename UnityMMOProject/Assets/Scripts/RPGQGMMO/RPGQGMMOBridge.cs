using System;
using UnityEngine;

namespace RPGQGMMO
{
    [Serializable]
    public struct RPGQGCardProfile
    {
        public string cardId;
        public string displayName;
        public string archetype;
        public int maxHealth;
        public int attackPower;
        public float moveSpeed;
        public string role;

        public static RPGQGCardProfile FromCardId(string id)
        {
            string safeId = string.IsNullOrEmpty(id) ? "starter-gardien" : id;
            RPGQGCardProfile profile = new RPGQGCardProfile
            {
                cardId = safeId,
                displayName = safeId,
                archetype = "gardien",
                maxHealth = 160,
                attackPower = 14,
                moveSpeed = 4.5f,
                role = "Défenseur"
            };

            if (safeId.IndexOf("mage", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                profile.archetype = "mage";
                profile.maxHealth = 120;
                profile.attackPower = 18;
                profile.moveSpeed = 5.0f;
                profile.role = "Mage";
            }
            else if (safeId.IndexOf("rodeur", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                profile.archetype = "rodeur";
                profile.maxHealth = 140;
                profile.attackPower = 16;
                profile.moveSpeed = 5.5f;
                profile.role = "Éclaireur";
            }

            return profile;
        }
    }

    /// <summary>
    /// Unity orchestration layer for FreedomArena/RPGQG cards and the Lua MMO rules.
    /// Persistence remains local until the Supabase adapter is introduced.
    /// </summary>
    public class RPGQGMMOBridge : MonoBehaviour
    {
        [Header("Player")]
        public RPGQGPlayerController playerController;
        public RPGQGCombatController playerCombat;
        public RPGQGLootInventory inventory;
        public RPGQGQuestRuntime questRuntime;

        [Header("FreedomArena / RPGQG Card")]
        public string equippedCardId = "starter-gardien";
        public string playerName = "RPGQG Player";
        public string PlayerName { get { return playerName; } }
        public int Experience { get { return PlayerPrefs.GetInt("RPGQG_XP", 0); } }

        public void GrantGameplayReward(int baseXp)
        {
            int reward = Mathf.Max(1, Mathf.RoundToInt(baseXp * 1f));
            GrantExperience(reward);
            NotifyStateChanged("reward:xp:" + reward);
        }

        [Header("Persistence")]
        public bool autosaveState = true;
        public float saveInterval = 10f;

        public event Action<string> StateChanged;
        private float nextSave;

        private void Awake()
        {
            if (playerController == null) playerController = FindObjectOfType<RPGQGPlayerController>();
            if (playerCombat == null) playerCombat = FindObjectOfType<RPGQGCombatController>();
            if (inventory == null) inventory = FindObjectOfType<RPGQGLootInventory>();
            if (questRuntime == null) questRuntime = FindObjectOfType<RPGQGQuestRuntime>();

            if (playerCombat != null)
            {
                playerCombat.ExperienceGranted += OnExperienceGranted;
                playerCombat.Died += OnPlayerDied;
            }
            if (inventory != null) inventory.ItemAdded += OnItemAdded;
            if (questRuntime != null) questRuntime.StepCompleted += OnQuestStep;
        }

        private void Start()
        {
            LoadLocalState();
            ApplyCard(equippedCardId);
            nextSave = Time.time + saveInterval;
        }

        private void Update()
        {
            if (!autosaveState || Time.time < nextSave) return;
            nextSave = Time.time + Mathf.Max(1f, saveInterval);
            SaveLocalState();
        }

        public RPGQGCardProfile GetCardProfile()
        {
            return RPGQGCardProfile.FromCardId(equippedCardId);
        }

        public void ApplyCard(string cardId)
        {
            RPGQGCardProfile profile = RPGQGCardProfile.FromCardId(cardId);
            equippedCardId = profile.cardId;

            if (playerCombat != null)
                playerCombat.Configure(profile.maxHealth, profile.attackPower);

            StateChanged?.Invoke("card:" + equippedCardId + ":" + profile.archetype + ":" + profile.maxHealth + ":" + profile.attackPower);
        }

        public void OnEnemyDefeated(string enemyId)
        {
            if (inventory != null) inventory.GrantEnemyLoot(enemyId);
            if (questRuntime != null && enemyId == "Spectre du Vide" && questRuntime.CanComplete("defeat-spectre"))
                questRuntime.CompleteStep("defeat-spectre");
            SaveLocalState();
        }

        public void OnPrismCollected()
        {
            if (questRuntime != null && questRuntime.CanComplete("gather-prism"))
                questRuntime.CompleteStep("gather-prism");
        }

        public void OnBeaconCrafted()
        {
            if (inventory != null &&
                inventory.Remove("Prisme d'Astéroïde", 1) &&
                inventory.Remove("Essence du Vide", 1) &&
                questRuntime != null &&
                questRuntime.CanComplete("craft-beacon"))
            {
                inventory.Add("Balise Stellaris", 1);
                questRuntime.CompleteStep("craft-beacon");
            }
        }

        public void OnRelayActivated()
        {
            if (questRuntime != null && questRuntime.CanComplete("activate-relay"))
                questRuntime.CompleteStep("activate-relay");
        }

        private void OnExperienceGranted(int amount)
        {
            int xp = PlayerPrefs.GetInt("RPGQG_XP", 0) + Mathf.Max(0, amount);
            PlayerPrefs.SetInt("RPGQG_XP", xp);
            StateChanged?.Invoke("xp:" + xp);
        }

        private void OnPlayerDied()
        {
            StateChanged?.Invoke("player:dead");
        }

        private void OnItemAdded(string itemId, int amount)
        {
            StateChanged?.Invoke("loot:" + itemId + ":" + amount);
        }

        private void OnQuestStep(string stepId)
        {
            StateChanged?.Invoke("quest:" + stepId);
        }

        public void SaveLocalState()
        {
            if (playerController != null)
            {
                Vector3 p = playerController.transform.position;
                PlayerPrefs.SetFloat("RPGQG_POS_X", p.x);
                PlayerPrefs.SetFloat("RPGQG_POS_Y", p.y);
                PlayerPrefs.SetFloat("RPGQG_POS_Z", p.z);
            }

            PlayerPrefs.SetString("RPGQG_CARD", equippedCardId);
            PlayerPrefs.SetString("RPGQG_NAME", playerName);
            PlayerPrefs.Save();
            StateChanged?.Invoke("saved");
        }

        public void LoadLocalState()
        {
            if (playerController != null && PlayerPrefs.HasKey("RPGQG_POS_X"))
            {
                Vector3 p = new Vector3(
                    PlayerPrefs.GetFloat("RPGQG_POS_X"),
                    PlayerPrefs.GetFloat("RPGQG_POS_Y"),
                    PlayerPrefs.GetFloat("RPGQG_POS_Z"));
                playerController.Teleport(p);
            }

            if (PlayerPrefs.HasKey("RPGQG_CARD"))
                equippedCardId = PlayerPrefs.GetString("RPGQG_CARD", equippedCardId);
            if (PlayerPrefs.HasKey("RPGQG_NAME"))
                playerName = PlayerPrefs.GetString("RPGQG_NAME", playerName);
        }
    }
}
