using System;
using System.Collections.Generic;
using UnityEngine;

namespace RPGQGMMO
{
    [Serializable]
    public class RPGQGItemStack
    {
        public string id;
        public int amount;

        public RPGQGItemStack(string itemId, int count)
        {
            id = itemId;
            amount = count;
        }
    }

    /// <summary>
    /// Lightweight runtime inventory. Persistence is intentionally delegated to the MMO bridge.
    /// </summary>
    public class RPGQGLootInventory : MonoBehaviour
    {
        [SerializeField] private List<RPGQGItemStack> items = new List<RPGQGItemStack>();
        public IReadOnlyList<RPGQGItemStack> Items { get { return items; } }

        public event Action<string, int> ItemAdded;

        public void Add(string itemId, int amount = 1)
        {
            if (string.IsNullOrEmpty(itemId) || amount <= 0) return;
            RPGQGItemStack stack = items.Find(x => x.id == itemId);
            if (stack == null)
            {
                stack = new RPGQGItemStack(itemId, amount);
                items.Add(stack);
            }
            else stack.amount += amount;
            ItemAdded?.Invoke(itemId, amount);
        }

        public bool Remove(string itemId, int amount = 1)
        {
            RPGQGItemStack stack = items.Find(x => x.id == itemId);
            if (stack == null || amount <= 0 || stack.amount < amount) return false;
            stack.amount -= amount;
            if (stack.amount == 0) items.Remove(stack);
            return true;
        }

        public int Count(string itemId)
        {
            RPGQGItemStack stack = items.Find(x => x.id == itemId);
            return stack == null ? 0 : stack.amount;
        }

        public void GrantEnemyLoot(string enemyId)
        {
            if (enemyId == "Spectre du Vide")
            {
                Add("Prisme d'Astéroïde", 1);
                Add("Essence du Vide", 1);
            }
            else
            {
                Add("Alliage Stellaire", 1);
            }
        }
    }
}
