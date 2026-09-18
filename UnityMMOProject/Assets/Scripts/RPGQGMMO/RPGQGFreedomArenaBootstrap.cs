using UnityEngine;

namespace RPGQGMMO
{
    /// <summary>
    /// Minimal runtime bootstrap for the FreedomArena-based MMO.
    /// It only wires gameplay components to an existing Player object and never
    /// creates a replacement world or legacy scene.
    /// </summary>
    public sealed class RPGQGFreedomArenaBootstrap : MonoBehaviour
    {
        [SerializeField] private GameObject playerRoot;
        [SerializeField] private bool generatePrototypeArena = true;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Initialize()
        {
            RPGQGFreedomArenaBootstrap existing = FindObjectOfType<RPGQGFreedomArenaBootstrap>();
            if (existing != null) return;

            GameObject host = new GameObject("RPGQG_FreedomArenaRuntime");
            Object.DontDestroyOnLoad(host);
            host.AddComponent<RPGQGFreedomArenaBootstrap>();
        }

        private void Start()
        {
            GameObject player = playerRoot != null
                ? playerRoot
                : GameObject.FindGameObjectWithTag("Player");

            if (player == null)
            {
                Debug.LogWarning("RPGQG: aucun Player présent dans la scène FreedomArena.");
                return;
            }

            EnsurePlayerComponents(player);
            if (generatePrototypeArena && GetComponent<RPGQGFreedomArenaWorldGenerator>() == null)
                gameObject.AddComponent<RPGQGFreedomArenaWorldGenerator>();
        }

        private static void EnsurePlayerComponents(GameObject player)
        {
            if (player.GetComponent<CharacterController>() == null)
                player.AddComponent<CharacterController>();

            RPGQGPlayerController controller = player.GetComponent<RPGQGPlayerController>();
            if (controller == null)
                controller = player.AddComponent<RPGQGPlayerController>();

            RPGQGCombatController combat = player.GetComponent<RPGQGCombatController>();
            if (combat == null)
                combat = player.AddComponent<RPGQGCombatController>();

            RPGQGLootInventory inventory = player.GetComponent<RPGQGLootInventory>();
            if (inventory == null)
                inventory = player.AddComponent<RPGQGLootInventory>();

            RPGQGQuestRuntime quest = player.GetComponent<RPGQGQuestRuntime>();
            if (quest == null)
                quest = player.AddComponent<RPGQGQuestRuntime>();

            RPGQGMMOModularUI modularUI = player.GetComponent<RPGQGMMOModularUI>();
            if (modularUI == null)
                modularUI = player.AddComponent<RPGQGMMOModularUI>();

            RPGQGMobileControls mobile = player.GetComponent<RPGQGMobileControls>();
            if (mobile == null) mobile = player.AddComponent<RPGQGMobileControls>();

            RPGQGGameCollector collector = player.GetComponent<RPGQGGameCollector>();
            if (collector == null) collector = player.AddComponent<RPGQGGameCollector>();

            RPGQGGameLibrary library = player.GetComponent<RPGQGGameLibrary>();
            if (library == null) library = player.AddComponent<RPGQGGameLibrary>();

            RPGQGCharacterProfileUI profileUI = player.GetComponent<RPGQGCharacterProfileUI>();
            if (profileUI == null) profileUI = player.AddComponent<RPGQGCharacterProfileUI>();

            RPGQGMMOUI ui = player.GetComponent<RPGQGMMOUI>();
            if (ui == null)
                ui = player.AddComponent<RPGQGMMOUI>();

            RPGQGMMOBridge bridge = player.GetComponent<RPGQGMMOBridge>();
            if (bridge == null)
                bridge = player.AddComponent<RPGQGMMOBridge>();

            bridge.playerController = controller;
            bridge.playerCombat = combat;
            bridge.inventory = inventory;
            bridge.questRuntime = quest;

            if (Camera.main != null)
                controller.cameraTransform = Camera.main.transform;
        }
    }
}
