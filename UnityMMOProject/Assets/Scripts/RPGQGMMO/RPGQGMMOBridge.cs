using System;
using UnityEngine;

namespace RPGQGMMO
{
    /// <summary>
    /// Unity-side orchestration layer between RPGQG cards, the Lua MMO engine and scene objects.
    /// No external Lua package is required: the existing main.lua remains the gameplay rules source,
    /// while Unity exposes events/state that a Lua host can bind to later.
    /// </summary>
    public class RPGQGMMOBridge : MonoBehaviour
    {
        [Header("Player")]
        public RPGQGPlayerController playerController;
        public RPGQGCombatController playerCombat;
        public RPGQGLootInventory inventory;
        public RPGQGQuestRuntime questRuntime;

        [Header("RPGQG Card")]
        public string equippedCardId = "starter-gardien";
        public string playerName = "RPGQG Pilot";

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
            ApplyCard(equippedCardId);
            LoadLocalState();
            nextSave = Time.time + saveInterval;
        }

        private void Update()
        {
            if (!autosaveState || Time.time < nextSave) return;
            nextSave = Time.time + Mathf.Max(1f, saveInterval);
            SaveLocalState();
        }

        public void ApplyCard(string cardId)
        {
            equippedCardId = string.IsNullOrEmpty(cardId) ? "starter-gardien" : cardId;
            if (playerCombat == null) return;

            if (equippedCardId.IndexOf("mage", StringComparison.OrdinalIgnoreCase) >= 0)
                playerCombat.Configure(120, 18);
            else if (equippedCardId.IndexOf("rodeur", StringComparison.OrdinalIgnoreCase) >= 0)
                playerCombat.Configure(140, 16);
            else
                playerCombat.Configure(160, 14);

            StateChanged?.Invoke("card:" + equippedCardId);
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
            if (inventory != null && inventory.Remove("Prisme d'Astéroïde", 1) &&
                inventory.Remove("Essence du Vide", 1) &&
                questRuntime != null && questRuntime.CanComplete("craft-beacon"))
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
            // XP is kept in PlayerPrefs until Supabase/Auth is connected.
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
        }
    }
}
