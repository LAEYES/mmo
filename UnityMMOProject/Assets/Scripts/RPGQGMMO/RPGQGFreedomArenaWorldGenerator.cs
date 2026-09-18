using UnityEngine;

namespace RPGQGMMO
{
    /// <summary>
    /// Procedural FreedomArena prototype generator.
    /// Builds a deterministic sci-fi/fantasy combat arena at runtime using
    /// the project's simple OBJ assets when they are available.
    /// </summary>
    public sealed class RPGQGFreedomArenaWorldGenerator : MonoBehaviour
    {
        [Header("Generation")]
        public int seed = 20260918;
        public int width = 28;
        public int depth = 28;
        public float cellSize = 2f;
        public int obstacleCount = 18;
        public int enemyCount = 6;
        public bool generateOnStart = true;

        [Header("Gameplay")]
        public Vector3 playerSpawn = new Vector3(0f, 1f, 0f);

        private System.Random random;

        private void Start()
        {
            if (generateOnStart) Generate();
        }

        [ContextMenu("Generate FreedomArena")]
        public void Generate()
        {
            random = new System.Random(seed);
            Transform root = transform.Find("GeneratedArena");
            if (root != null) Destroy(root.gameObject);

            GameObject arena = new GameObject("GeneratedArena");
            arena.transform.SetParent(transform, false);

            CreateFloor(arena.transform);
            CreatePortal(arena.transform, new Vector3(0f, 0f, 0f));
            CreateObjective(arena.transform, new Vector3(0f, 0.1f, 10f));
            CreateObjective(arena.transform, new Vector3(10f, 0.1f, 0f));
            CreateObstacles(arena.transform);
            CreateEnemies(arena.transform);

            GameObject player = GameObject.FindGameObjectWithTag("Player");
            if (player != null) player.transform.position = playerSpawn;
        }

        private void CreateFloor(Transform parent)
        {
            GameObject floor = GameObject.CreatePrimitive(PrimitiveType.Plane);
            floor.name = "FreedomArena_Floor";
            floor.transform.SetParent(parent, false);
            floor.transform.position = Vector3.zero;
            floor.transform.localScale = new Vector3(width * cellSize / 10f, 1f, depth * cellSize / 10f);

            Renderer renderer = floor.GetComponent<Renderer>();
            if (renderer != null) renderer.material = new Material(Shader.Find("Standard"));
        }

        private void CreatePortal(Transform parent, Vector3 position)
        {
            GameObject portal = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            portal.name = "SpawnPortal";
            portal.transform.SetParent(parent, false);
            portal.transform.position = position + Vector3.up * 0.1f;
            portal.transform.localScale = new Vector3(2.2f, 0.08f, 2.2f);
        }

        private void CreateObjective(Transform parent, Vector3 position)
        {
            GameObject objective = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            objective.name = "Stellacristal_Objective";
            objective.transform.SetParent(parent, false);
            objective.transform.position = position;
            objective.transform.localScale = new Vector3(1.3f, 0.12f, 1.3f);
        }

        private void CreateObstacles(Transform parent)
        {
            for (int i = 0; i < obstacleCount; i++)
            {
                float x = Mathf.Round((float)(random.NextDouble() * (width - 4) - (width - 4) / 2f)) * cellSize;
                float z = Mathf.Round((float)(random.NextDouble() * (depth - 4) - (depth - 4) / 2f)) * cellSize;
                if (Vector2.Distance(new Vector2(x, z), Vector2.zero) < 5f) { i--; continue; }

                GameObject obstacle = GameObject.CreatePrimitive(
                    random.Next(0, 2) == 0 ? PrimitiveType.Cube : PrimitiveType.Cylinder);
                obstacle.name = "FreedomArena_Cover_" + i;
                obstacle.transform.SetParent(parent, false);
                obstacle.transform.position = new Vector3(x, 1f, z);
                obstacle.transform.localScale = new Vector3(
                    random.Next(1, 3) * 1.5f,
                    random.Next(1, 3),
                    random.Next(1, 3) * 1.5f);
            }
        }

        private void CreateEnemies(Transform parent)
        {
            for (int i = 0; i < enemyCount; i++)
            {
                float angle = (Mathf.PI * 2f * i) / Mathf.Max(1, enemyCount);
                float radius = 8f + (float)random.NextDouble() * 7f;

                GameObject enemy = GameObject.CreatePrimitive(PrimitiveType.Capsule);
                enemy.name = "SpectreDuVide_" + i;
                enemy.transform.SetParent(parent, false);
                enemy.transform.position = new Vector3(
                    Mathf.Cos(angle) * radius,
                    1f,
                    Mathf.Sin(angle) * radius);

                RPGQGEnemy ai = enemy.AddComponent<RPGQGEnemy>();
                ai.enemyId = "Spectre du Vide";
                ai.maxHealth = 80 + random.Next(0, 41);
                ai.attackPower = 8 + random.Next(0, 5);
                ai.detectionRange = 16f;
                ai.attackRange = 2.4f;
            }
        }
    }
}
