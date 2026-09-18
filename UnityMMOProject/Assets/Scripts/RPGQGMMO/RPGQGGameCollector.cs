using System;
using System.Collections.Generic;
using UnityEngine;

namespace RPGQGMMO
{
    [Serializable]
    public class RPGQGCollectedCard
    {
        public string cardId;
        public int copies;
        public bool favorite;
    }

    /// <summary>
    /// Local collector layer for RPGQG cards. It stores ownership and avoids
    /// bundling or distributing copyrighted ROMs/assets.
    /// </summary>
    public sealed class RPGQGGameCollector : MonoBehaviour
    {
        public event Action<string> CardCollected;
        public List<RPGQGCollectedCard> cards = new List<RPGQGCollectedCard>();

        private const string SaveKey = "RPGQG_COLLECTOR";

        private void Awake()
        {
            Load();
            EnsureStarter();
        }

        public bool Owns(string cardId)
        {
            RPGQGCollectedCard card = cards.Find(c => c.cardId == cardId);
            return card != null && card.copies > 0;
        }

        public void Collect(string cardId)
        {
            if (string.IsNullOrEmpty(cardId)) return;
            RPGQGCollectedCard card = cards.Find(c => c.cardId == cardId);
            if (card == null)
            {
                card = new RPGQGCollectedCard { cardId = cardId, copies = 0 };
                cards.Add(card);
            }
            card.copies++;
            Save();
            CardCollected?.Invoke(cardId);
        }

        public void SetFavorite(string cardId, bool value)
        {
            RPGQGCollectedCard card = cards.Find(c => c.cardId == cardId);
            if (card == null) return;
            card.favorite = value;
            Save();
        }

        public int UniqueCards
        {
            get { return cards.FindAll(c => c.copies > 0).Count; }
        }

        private void EnsureStarter()
        {
            if (cards.Count == 0) Collect("starter-gardien");
        }

        public void Save()
        {
            string json = JsonUtility.ToJson(new CollectorSave { cards = cards });
            PlayerPrefs.SetString(SaveKey, json);
            PlayerPrefs.Save();
        }

        public void Load()
        {
            cards.Clear();
            if (!PlayerPrefs.HasKey(SaveKey)) return;
            CollectorSave save = JsonUtility.FromJson<CollectorSave>(PlayerPrefs.GetString(SaveKey));
            if (save != null && save.cards != null) cards.AddRange(save.cards);
        }

        [Serializable]
        private class CollectorSave
        {
            public List<RPGQGCollectedCard> cards;
        }
    }
}
