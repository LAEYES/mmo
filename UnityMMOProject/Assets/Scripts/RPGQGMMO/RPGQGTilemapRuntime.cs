using System.Collections.Generic;
using UnityEngine;

namespace RPGQGMMO
{
    /// <summary>
    /// Runtime helper for FreedomArena tiles.
    /// Expects imported Unity Tilemap/Grid assets to be referenced in the scene.
    /// Canva remains the visual source of the tile library.
    /// </summary>
    public sealed class RPGQGTilemapRuntime : MonoBehaviour
    {
        [Header("FreedomArena")]
        [SerializeField] private Transform tilemapRoot;
        [SerializeField] private bool spawnFallbackGrid = false;
        [SerializeField] private int width = 32;
        [SerializeField] private int height = 20;
        [SerializeField] private float cellSize = 1f;

        private readonly List<GameObject> fallbackTiles = new List<GameObject>();

        private void Start()
        {
            if (!spawnFallbackGrid) return;
            BuildFallbackGrid();
        }

        public void BuildStrategicArenaTiles(int arenaIndex)
        {
            ClearFallbackGrid();
            int variant = Mathf.Abs(arenaIndex) % 5;
            width = 24 + variant * 4;
            height = 18 + variant * 3;
            cellSize = 1f;
            for (int y = 0; y < height; y++)
            for (int x = 0; x < width; x++)
            {
                GameObject tile = GameObject.CreatePrimitive(PrimitiveType.Quad);
                tile.name = "FA_Tile_" + variant + "_" + x + "_" + y;
                tile.transform.SetParent(tilemapRoot != null ? tilemapRoot : transform);
                tile.transform.position = CellToWorld(x, y) + Vector3.up * 0.01f;
                tile.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
                tile.transform.localScale = Vector3.one * cellSize;
                fallbackTiles.Add(tile);
            }
        }

        public Vector3 CellToWorld(int x, int y)
        {
            Vector3 origin = tilemapRoot != null ? tilemapRoot.position : transform.position;
            return origin + new Vector3(x * cellSize, 0f, y * cellSize);
        }

        private void BuildFallbackGrid()
        {
            ClearFallbackGrid();

            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
                {
                    GameObject tile = GameObject.CreatePrimitive(PrimitiveType.Quad);
                    tile.name = "FreedomArena_Tile_" + x + "_" + y;
                    tile.transform.SetParent(tilemapRoot != null ? tilemapRoot : transform);
                    tile.transform.position = CellToWorld(x, y) + Vector3.up * 0.01f;
                    tile.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
                    tile.transform.localScale = Vector3.one * cellSize;
                    fallbackTiles.Add(tile);
                }
            }
        }

        private void ClearFallbackGrid()
        {
            for (int i = fallbackTiles.Count - 1; i >= 0; i--)
            {
                if (fallbackTiles[i] != null)
                    Destroy(fallbackTiles[i]);
            }

            fallbackTiles.Clear();
        }
    }
}
