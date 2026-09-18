using System;
using System.Collections.Generic;
using UnityEngine;

namespace RPGQGMMO
{
    [Serializable]
    public class RPGQGGameEntry
    {
        public string gameId;
        public string title;
        public string platform;
        public string emulatorProfile;
        public bool installed;
    }

    /// <summary>
    /// Safe game-library metadata layer. It stores references and launch metadata,
    /// not copyrighted ROM content.
    /// </summary>
    public sealed class RPGQGGameLibrary : MonoBehaviour
    {
        public List<RPGQGGameEntry> entries = new List<RPGQGGameEntry>();
        public event Action<string> LaunchRequested;

        public void Register(string gameId, string title, string platform, string emulatorProfile)
        {
            if (string.IsNullOrEmpty(gameId)) return;
            RPGQGGameEntry existing = entries.Find(e => e.gameId == gameId);
            if (existing != null)
            {
                existing.title = title;
                existing.platform = platform;
                existing.emulatorProfile = emulatorProfile;
                return;
            }
            entries.Add(new RPGQGGameEntry
            {
                gameId = gameId,
                title = title,
                platform = platform,
                emulatorProfile = emulatorProfile,
                installed = false
            });
        }

        public void SetInstalled(string gameId, bool value)
        {
            RPGQGGameEntry entry = entries.Find(e => e.gameId == gameId);
            if (entry != null) entry.installed = value;
        }

        public bool CanLaunch(string gameId)
        {
            RPGQGGameEntry entry = entries.Find(e => e.gameId == gameId);
            return entry != null && entry.installed;
        }

        public void RequestLaunch(string gameId)
        {
            if (CanLaunch(gameId))
                LaunchRequested?.Invoke(gameId);
        }
    }
}
