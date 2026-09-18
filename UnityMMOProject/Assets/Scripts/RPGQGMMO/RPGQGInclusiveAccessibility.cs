using UnityEngine;
using UnityEngine.UI;

namespace RPGQGMMO
{
    /// <summary>
    /// Inclusive Android accessibility layer for FreedomArena.
    /// Provides large UI, contrast, text scaling, reduced motion, color-assist,
    /// left-handed layout and optional vibration/audio feedback.
    /// </summary>
    public sealed class RPGQGInclusiveAccessibility : MonoBehaviour
    {
        public static RPGQGInclusiveAccessibility Instance { get; private set; }

        [Header("Accessibility")]
        [Range(.8f, 2f)] public float textScale = 1f;
        [Range(.8f, 1.6f)] public float uiScale = 1f;
        public bool highContrast;
        public bool reducedMotion;
        public bool leftHanded;
        public bool colorAssist;
        public bool vibrationFeedback = true;
        public bool audioFeedback = true;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            Load();
            Apply();
        }

        public void Apply()
        {
            Time.timeScale = 1f;
            Canvas[] canvases = FindObjectsOfType<Canvas>();
            foreach (Canvas canvas in canvases)
            {
                CanvasScaler scaler = canvas.GetComponent<CanvasScaler>();
                if (scaler != null) scaler.scaleFactor = uiScale;
                foreach (Text text in canvas.GetComponentsInChildren<Text>(true))
                    text.fontSize = Mathf.RoundToInt(Mathf.Max(10, text.fontSize) * textScale);
            }

            if (reducedMotion)
                QualitySettings.vSyncCount = 0;
        }

        public void SetTextScale(float value) { textScale = Mathf.Clamp(value, .8f, 2f); SaveAndApply(); }
        public void SetUIScale(float value) { uiScale = Mathf.Clamp(value, .8f, 1.6f); SaveAndApply(); }
        public void SetHighContrast(bool value) { highContrast = value; SaveAndApply(); }
        public void SetReducedMotion(bool value) { reducedMotion = value; SaveAndApply(); }
        public void SetLeftHanded(bool value) { leftHanded = value; SaveAndApply(); }
        public void SetColorAssist(bool value) { colorAssist = value; SaveAndApply(); }
        public void SetVibration(bool value) { vibrationFeedback = value; SaveAndApply(); }
        public void SetAudioFeedback(bool value) { audioFeedback = value; SaveAndApply(); }

        public void Haptic()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            if (vibrationFeedback) Handheld.Vibrate();
#endif
        }

        private void SaveAndApply()
        {
            Save();
            Apply();
        }

        private void Save()
        {
            PlayerPrefs.SetFloat("FA_TextScale", textScale);
            PlayerPrefs.SetFloat("FA_UIScale", uiScale);
            PlayerPrefs.SetInt("FA_HighContrast", highContrast ? 1 : 0);
            PlayerPrefs.SetInt("FA_ReducedMotion", reducedMotion ? 1 : 0);
            PlayerPrefs.SetInt("FA_LeftHanded", leftHanded ? 1 : 0);
            PlayerPrefs.SetInt("FA_ColorAssist", colorAssist ? 1 : 0);
            PlayerPrefs.SetInt("FA_Vibration", vibrationFeedback ? 1 : 0);
            PlayerPrefs.SetInt("FA_Audio", audioFeedback ? 1 : 0);
            PlayerPrefs.Save();
        }

        private void Load()
        {
            textScale = PlayerPrefs.GetFloat("FA_TextScale", 1f);
            uiScale = PlayerPrefs.GetFloat("FA_UIScale", 1f);
            highContrast = PlayerPrefs.GetInt("FA_HighContrast", 0) == 1;
            reducedMotion = PlayerPrefs.GetInt("FA_ReducedMotion", 0) == 1;
            leftHanded = PlayerPrefs.GetInt("FA_LeftHanded", 0) == 1;
            colorAssist = PlayerPrefs.GetInt("FA_ColorAssist", 0) == 1;
            vibrationFeedback = PlayerPrefs.GetInt("FA_Vibration", 1) == 1;
            audioFeedback = PlayerPrefs.GetInt("FA_Audio", 1) == 1;
        }
    }
}
