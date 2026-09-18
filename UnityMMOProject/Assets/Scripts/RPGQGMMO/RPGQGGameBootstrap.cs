using UnityEngine;

namespace RPGQGMMO
{
    /// <summary>
    /// Runtime bootstrap for a playable SpaceOutpost prototype.
    /// It leaves the existing scene assets untouched and creates missing gameplay actors at runtime.
    /// </summary>
    public static class RPGQGGameBootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Initialize()
        {
            if (Object.FindObjectOfType<RPGQGMMOBridge>() != null) return;

            GameObject player = GameObject.FindGameObjectWithTag("Player");
            if (player == null)
            {
                player = GameObject.CreatePrimitive(PrimitiveType.Capsule);
                player.name = "RPGQG_Player";
                player.tag = "Player";
                player.transform.position = new Vector3(0f, 1f, 0f);
                Object.Destroy(player.GetComponent<Collider>());
                player.AddComponent<CharacterController>();
            }

            RPGQGPlayerController controller = player.GetComponent<RPGQGPlayerController>();
            if (controller == null) controller = player.AddComponent<RPGQGPlayerController>();

            RPGQGCombatController combat = player.GetComponent<RPGQGCombatController>();
            if (combat == null) combat = player.AddComponent<RPGQGCombatController>();

            RPGQGLootInventory inventory = player.GetComponent<RPGQGLootInventory>();
            if (inventory == null) inventory = player.AddComponent<RPGQGLootInventory>();

            RPGQGQuestRuntime quest = player.GetComponent<RPGQGQuestRuntime>();
            if (quest == null) quest = player.AddComponent<RPGQGQuestRuntime>();

            RPGQGMMOBridge bridge = player.GetComponent<RPGQGMMOBridge>();
            if (bridge == null) bridge = player.AddComponent<RPGQGMMOBridge>();
            bridge.playerController = controller;
            bridge.playerCombat = combat;
            bridge.inventory = inventory;
            bridge.questRuntime = quest;

            EnsureGround();
            EnsureEnemy(new Vector3(8f, 1f, 8f));
            EnsureEnemy(new Vector3(-10f, 1f, 12f));

            if (Camera.main != null)
            {
                controller.cameraTransform = Camera.main.transform;
                Camera.main.transform.position = new Vector3(0f, 9f, -14f);
                Camera.main.transform.LookAt(player.transform.position + Vector3.up);
            }
        }

        private static void EnsureGround()
        {
            GameObject ground = GameObject.Find("RPGQG_RuntimeGround");
            if (ground != null) return;

            ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "RPGQG_RuntimeGround";
            ground.transform.position = Vector3.zero;
            ground.transform.localScale = Vector3.one * 8f;
        }

        private static void EnsureEnemy(Vector3 position)
        {
            GameObject enemy = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            enemy.name = "Spectre du Vide";
            enemy.transform.position = position;
            enemy.transform.localScale = Vector3.one * 1.5f;
            enemy.AddComponent<RPGQGEnemy>();
        }
    }
}
