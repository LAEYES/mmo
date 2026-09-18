using System;
using UnityEngine;

namespace RPGQGMMO
{
    /// <summary>
    /// Logical catalog for the FreedomArena tile library.
    /// Assign imported Sprite assets in the Unity inspector after Canva export.
    /// </summary>
    [CreateAssetMenu(fileName = "FreedomArenaAssetCatalog", menuName = "FreedomArena/Asset Catalog")]
    public sealed class RPGQGFreedomArenaAssetCatalog : ScriptableObject
    {
        [Header("Tiles")]
        public Sprite[] floors;
        public Sprite[] borders;
        public Sprite[] transitions;
        public Sprite[] walls;
        public Sprite[] platforms;
        public Sprite[] stairs;
        public Sprite[] bridges;

        [Header("Biomes")]
        public Sprite[] naturalTerrain;
        public Sprite[] water;
        public Sprite[] energy;
        public Sprite[] plasma;

        [Header("Tech")]
        public Sprite[] doors;
        public Sprite[] consoles;
        public Sprite[] panels;
        public Sprite[] industrial;

        [Header("Gameplay")]
        public Sprite[] obstacles;
        public Sprite[] spawnZones;
        public Sprite[] combatZones;
        public Sprite[] sanctuaries;
        public Sprite[] teleporters;
        public Sprite[] objectives;

        public int TotalSpriteCount
        {
            get
            {
                return Count(floors) + Count(borders) + Count(transitions)
                     + Count(walls) + Count(platforms) + Count(stairs) + Count(bridges)
                     + Count(naturalTerrain) + Count(water) + Count(energy) + Count(plasma)
                     + Count(doors) + Count(consoles) + Count(panels) + Count(industrial)
                     + Count(obstacles) + Count(spawnZones) + Count(combatZones)
                     + Count(sanctuaries) + Count(teleporters) + Count(objectives);
            }
        }

        private static int Count(Sprite[] sprites)
        {
            return sprites == null ? 0 : sprites.Length;
        }

        public Sprite GetFirstTile()
        {
            if (floors != null && floors.Length > 0) return floors[0];
            if (naturalTerrain != null && naturalTerrain.Length > 0) return naturalTerrain[0];
            return null;
        }
    }
}
