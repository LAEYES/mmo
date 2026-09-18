using UnityEngine;

namespace RPGQGMMO
{
    /// <summary>Installs the accessibility runtime and settings on the player.</summary>
    public sealed class RPGQGInclusiveBootstrap : MonoBehaviour
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Initialize()
        {
            if (FindObjectOfType<RPGQGInclusiveAccessibility>() == null)
            {
                GameObject settings = new GameObject("FreedomArena_InclusiveRuntime");
                settings.AddComponent<RPGQGInclusiveAccessibility>();
                settings.AddComponent<RPGQGAccessibilityUI>();
                DontDestroyOnLoad(settings);
            }
        }
    }
}
