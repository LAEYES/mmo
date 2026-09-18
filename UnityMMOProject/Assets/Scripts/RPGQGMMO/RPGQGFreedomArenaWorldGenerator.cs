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
        public bool autoEvolve = true;
        public float evolutionInterval = 45f;
        public float mutationRate = 0.18f;
        public int generation = 0;
        public int maxGenerations = 1000;
        public int playerDeaths;
        public int enemiesDefeated;

        [Header("Evolving Genome")]
        public float combatDensity = 0.45f;
        public float objectiveSpread = 0.7f;
        public float coverDensity = 0.55f;
        public float spawnRadius = 10f;
        public int biomeGene = 0;
        public int layoutGene = 0;
        public float hazardDensity = 0.25f;
        public float enemyPower = 1f;
        public float objectiveCaptureRadius = 2.5f;
        public float hazardSafeRadius = 2.25f;
        public int maxActiveEnemies = 8;
        public float respawnDelay = 5f;
        public float rewardMultiplier = 1f;
        private Vector3 lastSpawnPoint;

        [Header("Gameplay")]
        public Vector3 playerSpawn = new Vector3(0f, 1f, 0f);

        private System.Random random;
        private float nextEvolution;
        private RPGQGMMOBridge bridge;

        private void Start()
        {
            bridge = FindObjectOfType<RPGQGMMOBridge>();
            if (bridge != null) bridge.StateChanged += OnGameState;
            LoadEvolutionState();
            if (generateOnStart) Generate();
            nextEvolution = Time.time + evolutionInterval;
        }

        private void Update()
        {
            if (!autoEvolve || Time.time < nextEvolution) return;
            nextEvolution = Time.time + Mathf.Max(10f, evolutionInterval);
            Evolve();
        }

        private void OnDestroy()
        {
            if (bridge != null) bridge.StateChanged -= OnGameState;
        }

        private void OnGameState(string state)
        {
            if (state == "player:dead") playerDeaths++;
            else if (state.StartsWith("quest:defeat-spectre")) enemiesDefeated++;
        }

        [ContextMenu("Evolve FreedomArena")]
        public void Evolve()
        {
            generation = Mathf.Min(maxGenerations, generation + 1);
            float pressure = Mathf.Clamp01((playerDeaths * 0.08f) - (enemiesDefeated * 0.015f));
            float adaptation = Mathf.Clamp(1f + pressure + Random.Range(-mutationRate, mutationRate), 0.7f, 1.8f);
            obstacleCount = Mathf.Clamp(Mathf.RoundToInt(obstacleCount * adaptation), 8, 60);
            combatDensity = Mathf.Clamp01(combatDensity + Random.Range(-mutationRate, mutationRate));
            objectiveSpread = Mathf.Clamp01(objectiveSpread + Random.Range(-mutationRate, mutationRate));
            coverDensity = Mathf.Clamp01(coverDensity + Random.Range(-mutationRate, mutationRate));
            spawnRadius = Mathf.Clamp(spawnRadius + Random.Range(-3f, 3f), 6f, 18f);
            biomeGene = (biomeGene + Random.Range(0, 5)) % 5;
            layoutGene = (layoutGene + Random.Range(0, 4)) % 4;
            enemyCount = Mathf.Clamp(Mathf.RoundToInt(enemyCount * adaptation * (0.75f + combatDensity)), 2, maxActiveEnemies);
            hazardDensity = Mathf.Clamp01(hazardDensity + Random.Range(-mutationRate, mutationRate));
            enemyPower = Mathf.Clamp(enemyPower * (1f + Random.Range(-mutationRate * 0.5f, mutationRate * 0.5f)), 0.7f, 1.8f);
            objectiveCaptureRadius = Mathf.Clamp(objectiveCaptureRadius + Random.Range(-0.35f, 0.35f), 1.5f, 4f);
            rewardMultiplier = Mathf.Clamp(rewardMultiplier * (1f + Random.Range(-mutationRate * 0.35f, mutationRate * 0.35f)), 0.8f, 1.6f);
            seed = unchecked(seed * 1103515245 + 12345 + generation * 97);
            SaveEvolutionState();
            Generate();
        }

        private void SaveEvolutionState()
        {
            PlayerPrefs.SetInt("FA_GEN", generation);
            PlayerPrefs.SetInt("FA_SEED", seed);
            PlayerPrefs.SetInt("FA_OBS", obstacleCount);
            PlayerPrefs.SetInt("FA_ENEMIES", enemyCount);
            PlayerPrefs.SetInt("FA_DEATHS", playerDeaths);
            PlayerPrefs.SetInt("FA_KILLS", enemiesDefeated);
            PlayerPrefs.SetFloat("FA_COMBAT", combatDensity);
            PlayerPrefs.SetFloat("FA_OBJECTIVE", objectiveSpread);
            PlayerPrefs.SetFloat("FA_COVER", coverDensity);
            PlayerPrefs.SetFloat("FA_SPAWN_RADIUS", spawnRadius);
            PlayerPrefs.SetInt("FA_BIOME", biomeGene);
            PlayerPrefs.SetInt("FA_LAYOUT", layoutGene);
            PlayerPrefs.SetFloat("FA_HAZARD", hazardDensity);
            PlayerPrefs.SetFloat("FA_ENEMY_POWER", enemyPower);
            PlayerPrefs.SetFloat("FA_CAPTURE_RADIUS", objectiveCaptureRadius);
            PlayerPrefs.SetFloat("FA_REWARD", rewardMultiplier);
            PlayerPrefs.Save();
        }

        private void LoadEvolutionState()
        {
            generation = PlayerPrefs.GetInt("FA_GEN", 0);
            seed = PlayerPrefs.GetInt("FA_SEED", seed);
            obstacleCount = PlayerPrefs.GetInt("FA_OBS", obstacleCount);
            enemyCount = PlayerPrefs.GetInt("FA_ENEMIES", enemyCount);
            playerDeaths = PlayerPrefs.GetInt("FA_DEATHS", 0);
            enemiesDefeated = PlayerPrefs.GetInt("FA_KILLS", 0);
            combatDensity = PlayerPrefs.GetFloat("FA_COMBAT", combatDensity);
            objectiveSpread = PlayerPrefs.GetFloat("FA_OBJECTIVE", objectiveSpread);
            coverDensity = PlayerPrefs.GetFloat("FA_COVER", coverDensity);
            spawnRadius = PlayerPrefs.GetFloat("FA_SPAWN_RADIUS", spawnRadius);
            biomeGene = PlayerPrefs.GetInt("FA_BIOME", biomeGene);
            layoutGene = PlayerPrefs.GetInt("FA_LAYOUT", layoutGene);
            hazardDensity = PlayerPrefs.GetFloat("FA_HAZARD", hazardDensity);
            enemyPower = PlayerPrefs.GetFloat("FA_ENEMY_POWER", enemyPower);
            objectiveCaptureRadius = PlayerPrefs.GetFloat("FA_CAPTURE_RADIUS", objectiveCaptureRadius);
            rewardMultiplier = PlayerPrefs.GetFloat("FA_REWARD", rewardMultiplier);
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
            float spread = Mathf.Lerp(7f, 14f, objectiveSpread);
            CreateObjective(arena.transform, new Vector3(0f, 0.1f, spread));
            CreateObjective(arena.transform, new Vector3(spread, 0.1f, 0f));
            lastSpawnPoint = GetPlayerSpawnPoint();
            CreateHazards(arena.transform, random);
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
            if (!GameObject.FindGameObjectsWithTag("StrategicObjective").Length.Equals(0)) { }
            objective.transform.SetParent(parent, false);
            objective.transform.position = position;
            objective.transform.localScale = new Vector3(1.3f, 0.12f, 1.3f);
            try { objective.tag = "StrategicObjective"; } catch (UnityException) { }
        }

        private void CreateObstacles(Transform parent)
        {
            for (int i = 0; i < Mathf.RoundToInt(obstacleCount * Mathf.Lerp(0.65f, 1.35f, coverDensity)); i++)
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
                float radius = Mathf.Clamp(spawnRadius + (float)random.NextDouble() * 5f - 2.5f, 6f, 20f);

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
