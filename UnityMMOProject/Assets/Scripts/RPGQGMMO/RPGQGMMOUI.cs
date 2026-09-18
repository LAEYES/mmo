using UnityEngine;
using UnityEngine.UI;

namespace RPGQGMMO
{
    /// <summary>
    /// Runtime FreedomArena MMO HUD. Uses Unity UGUI only, so it works without
    /// a TextMeshPro dependency and can later be replaced by Canva artwork.
    /// </summary>
    public sealed class RPGQGMMOUI : MonoBehaviour
    {
        private RPGQGMMOBridge bridge;
        private RPGQGCombatController combat;
        private Canvas canvas;
        private Text statusText;
        private Slider healthBar;
        private Slider xpBar;
        private Button profileButton;
        private Button accessibilityButton;

        private void Awake()
        {
            bridge = GetComponent<RPGQGMMOBridge>();
            combat = GetComponent<RPGQGCombatController>();
            BuildUI();
        }

        private void OnEnable()
        {
            if (combat != null) combat.HealthChanged += RefreshHealth;
            if (bridge != null) bridge.StateChanged += RefreshState;
        }

        private void OnDisable()
        {
            if (combat != null) combat.HealthChanged -= RefreshHealth;
            if (bridge != null) bridge.StateChanged -= RefreshState;
        }

        private void Start()
        {
            RefreshAll();
        }

        private void BuildUI()
        {
            GameObject canvasObject = new GameObject("FreedomArena_HUD");
            canvasObject.transform.SetParent(transform, false);
            canvas = canvasObject.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasObject.AddComponent<CanvasScaler>();
            canvasObject.AddComponent<GraphicRaycaster>();

            GameObject root = new GameObject("HUDRoot");
            root.transform.SetParent(canvas.transform, false);
            RectTransform rootRect = root.AddComponent<RectTransform>();
            rootRect.anchorMin = new Vector2(0, 1);
            rootRect.anchorMax = new Vector2(1, 1);
            rootRect.pivot = new Vector2(.5f, 1);
            rootRect.sizeDelta = new Vector2(0, 150);

            Image panel = root.AddComponent<Image>();
            panel.color = new Color(.02f, .05f, .09f, .88f);

            statusText = CreateText(root.transform, "FreedomArena", 22, TextAnchor.UpperLeft);
            statusText.rectTransform.anchorMin = new Vector2(0, 1);
            statusText.rectTransform.anchorMax = new Vector2(0, 1);
            statusText.rectTransform.pivot = new Vector2(0, 1);
            statusText.rectTransform.anchoredPosition = new Vector2(24, -18);
            statusText.rectTransform.sizeDelta = new Vector2(600, 45);

            healthBar = CreateBar(root.transform, "Health", new Vector2(24, -65), new Color(.85f, .12f, .2f));
            xpBar = CreateBar(root.transform, "XP", new Vector2(24, -108), new Color(.1f, .65f, 1f));

            CreateButton(root.transform, "PROFIL", new Vector2(-210, -18), new Vector2(170, 52), OpenProfile);
            CreateButton(root.transform, "ACCESSIBILITÉ", new Vector2(-390, -18), new Vector2(170, 52), OpenAccessibility);
            CreateText(root.transform, "INVENTAIRE • QUÊTES • CARTE • COMPÉTENCES", 16, TextAnchor.MiddleRight)
                .rectTransform.SetPositionAndRotation(Vector3.zero, Quaternion.identity);

            Text menu = root.GetComponentsInChildren<Text>()[root.GetComponentsInChildren<Text>().Length - 1];
            menu.rectTransform.anchorMin = new Vector2(1, 0);
            menu.rectTransform.anchorMax = new Vector2(1, 1);
            menu.rectTransform.pivot = new Vector2(1, .5f);
            menu.rectTransform.anchoredPosition = new Vector2(-24, 0);
            menu.rectTransform.sizeDelta = new Vector2(700, 40);
        }

        private void CreateButton(Transform parent, string label, Vector2 position, Vector2 size, UnityEngine.Events.UnityAction action)
        {
            GameObject go = new GameObject(label);
            go.transform.SetParent(parent, false);
            RectTransform r = go.AddComponent<RectTransform>();
            r.anchorMin = new Vector2(1, 1); r.anchorMax = new Vector2(1, 1);
            r.pivot = new Vector2(1, 1); r.anchoredPosition = position; r.sizeDelta = size;
            Image image = go.AddComponent<Image>();
            image.color = new Color(.03f, .15f, .24f, 1);
            Button b = go.AddComponent<Button>();
            b.onClick.AddListener(action);
            Text t = CreateText(go.transform, label, 15, TextAnchor.MiddleCenter);
            t.rectTransform.anchorMin = Vector2.zero; t.rectTransform.anchorMax = Vector2.one;
            t.rectTransform.offsetMin = Vector2.zero; t.rectTransform.offsetMax = Vector2.zero;
        }

        private void OpenProfile()
        {
            RPGQGCharacterProfileUI profile = GetComponent<RPGQGCharacterProfileUI>();
            if (profile == null) profile = gameObject.AddComponent<RPGQGCharacterProfileUI>();
            profile.Open();
        }

        private void OpenAccessibility()
        {
            RPGQGAccessibilityUI access = FindObjectOfType<RPGQGAccessibilityUI>();
            if (access != null) access.Open();
        }

        private Slider CreateBar(Transform parent, string name, Vector2 position, Color fillColor)
        {
            GameObject go = new GameObject(name + "Bar");
            go.transform.SetParent(parent, false);
            RectTransform r = go.AddComponent<RectTransform>();
            r.anchorMin = new Vector2(0, 1);
            r.anchorMax = new Vector2(0, 1);
            r.pivot = new Vector2(0, 1);
            r.anchoredPosition = position;
            r.sizeDelta = new Vector2(420, 28);

            Image bg = go.AddComponent<Image>();
            bg.color = new Color(.05f, .08f, .12f, 1);

            GameObject fill = new GameObject("Fill");
            fill.transform.SetParent(go.transform, false);
            RectTransform fr = fill.AddComponent<RectTransform>();
            fr.anchorMin = Vector2.zero;
            fr.anchorMax = Vector2.one;
            fr.offsetMin = new Vector2(3, 3);
            fr.offsetMax = new Vector2(-3, -3);
            Image fi = fill.AddComponent<Image>();
            fi.color = fillColor;

            Slider slider = go.AddComponent<Slider>();
            slider.minValue = 0;
            slider.maxValue = 1;
            slider.value = 1;
            slider.fillRect = fr;
            slider.interactable = false;
            return slider;
        }

        private Text CreateText(Transform parent, string value, int size, TextAnchor alignment)
        {
            GameObject go = new GameObject("Text");
            go.transform.SetParent(parent, false);
            Text t = go.AddComponent<Text>();
            t.text = value;
            t.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            t.fontSize = size;
            t.alignment = alignment;
            t.color = Color.white;
            return t;
        }

        private void RefreshAll()
        {
            if (combat != null) RefreshHealth(combat.health);
            RefreshState("ready");
        }

        private void RefreshHealth(int hp)
        {
            if (healthBar != null && combat != null)
                healthBar.value = combat.maxHealth <= 0 ? 0 : (float)hp / combat.maxHealth;
        }

        private void RefreshState(string state)
        {
            if (statusText == null || bridge == null) return;
            RPGQGCardProfile card = bridge.GetCardProfile();
            int xp = PlayerPrefs.GetInt("RPGQG_XP", 0);
            statusText.text = "FREEDOMARENA  •  " + card.archetype.ToUpperInvariant() +
                "  •  " + bridge.playerName + "    HP " + combat.health + "/" + combat.maxHealth +
                "    XP " + xp + "    [" + state + "]";
            if (xpBar != null) xpBar.value = (xp % 100) / 100f;
        }
    }
}
