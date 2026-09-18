using UnityEngine;
using UnityEngine.UI;

namespace RPGQGMMO
{
    /// <summary>
    /// Lightweight mobile profile/character creation panel.
    /// Uses neutral character presentation: name + RPGQG card archetype.
    /// </summary>
    public sealed class RPGQGCharacterProfileUI : MonoBehaviour
    {
        private GameObject panel;
        private InputField nameField;
        private Dropdown archetype;
        private RPGQGMMOBridge bridge;

        private void Start()
        {
            bridge = GetComponent<RPGQGMMOBridge>();
            Build();
        }

        private void Build()
        {
            Canvas canvas = GetComponentInParent<Canvas>();
            if (canvas == null)
            {
                GameObject go = new GameObject("FreedomArena_ProfileCanvas");
                canvas = go.AddComponent<Canvas>();
                canvas.renderMode = RenderMode.ScreenSpaceOverlay;
                go.AddComponent<CanvasScaler>();
                go.AddComponent<GraphicRaycaster>();
            }

            panel = new GameObject("CharacterProfile");
            panel.transform.SetParent(canvas.transform, false);
            Image bg = panel.AddComponent<Image>();
            bg.color = new Color(.01f,.025f,.05f,.98f);
            RectTransform pr = panel.GetComponent<RectTransform>();
            pr.anchorMin = new Vector2(.5f,.5f); pr.anchorMax = new Vector2(.5f,.5f);
            pr.sizeDelta = new Vector2(760,620);

            Label("PROFIL RPGQG", 30, new Vector2(0,-35), new Vector2(680,60));
            Label("Nom du personnage", 20, new Vector2(-220,-120), new Vector2(300,50));

            nameField = Input("Nom", new Vector2(130,-120), new Vector2(350,58));
            nameField.text = bridge != null ? bridge.PlayerName : "RPGQG Player";

            Label("Archétype de carte",20,new Vector2(-220,-210),new Vector2(300,50));
            archetype = DropdownControl(new Vector2(130,-210),new Vector2(350,58));

            ButtonControl("ENTRER DANS FREEDOMARENA", new Vector2(0,-330), new Vector2(560,70), ApplyAndClose);
            ButtonControl("ANNULER", new Vector2(0,-430), new Vector2(300,60), Close);

            panel.SetActive(false);
        }

        private void ApplyAndClose()
        {
            if (bridge != null)
            {
                bridge.playerName = string.IsNullOrWhiteSpace(nameField.text) ? "RPGQG Player" : nameField.text.Trim();
                string[] ids = { "starter-gardien", "starter-mage", "starter-rodeur" };
                bridge.ApplyCard(ids[Mathf.Clamp(archetype.value,0,ids.Length-1)]);
                bridge.SaveLocalState();
            }
            Close();
        }

        public void Open(){ panel.SetActive(true); }
        public void Close(){ panel.SetActive(false); }

        private void Label(string text,int size,Vector2 pos,Vector2 sizeDelta)
        {
            Text t=MakeText(text,size);
            t.transform.SetParent(panel.transform,false);
            RectTransform r=t.rectTransform; r.anchorMin=new Vector2(.5f,1); r.anchorMax=new Vector2(.5f,1);
            r.pivot=new Vector2(.5f,1); r.anchoredPosition=pos; r.sizeDelta=sizeDelta;
        }

        private InputField Input(string placeholder,Vector2 pos,Vector2 size)
        {
            GameObject g=new GameObject("NameInput"); g.transform.SetParent(panel.transform,false);
            Image i=g.AddComponent<Image>(); i.color=new Color(.04f,.08f,.12f,1);
            RectTransform r=g.GetComponent<RectTransform>(); r.anchorMin=new Vector2(.5f,1); r.anchorMax=new Vector2(.5f,1);
            r.pivot=new Vector2(.5f,1); r.anchoredPosition=pos; r.sizeDelta=size;
            InputField f=g.AddComponent<InputField>();
            Text t=MakeText("",18); t.transform.SetParent(g.transform,false); t.rectTransform.offsetMin=new Vector2(18,0); t.rectTransform.offsetMax=new Vector2(-18,0);
            f.textComponent=t;
            return f;
        }

        private Dropdown DropdownControl(Vector2 pos,Vector2 size)
        {
            GameObject g=new GameObject("ArchetypeDropdown"); g.transform.SetParent(panel.transform,false);
            Image i=g.AddComponent<Image>(); i.color=new Color(.04f,.08f,.12f,1);
            RectTransform r=g.GetComponent<RectTransform>(); r.anchorMin=new Vector2(.5f,1); r.anchorMax=new Vector2(.5f,1);
            r.pivot=new Vector2(.5f,1); r.anchoredPosition=pos; r.sizeDelta=size;
            Dropdown d=g.AddComponent<Dropdown>();
            Text label=MakeText("Gardien",18); label.transform.SetParent(g.transform,false);
            label.rectTransform.offsetMin=new Vector2(18,0); label.rectTransform.offsetMax=new Vector2(-18,0);
            d.captionText=label; d.options.Add(new Dropdown.OptionData("Gardien")); d.options.Add(new Dropdown.OptionData("Mage")); d.options.Add(new Dropdown.OptionData("Rôdeur"));
            return d;
        }

        private void ButtonControl(string text,Vector2 pos,Vector2 size,UnityEngine.Events.UnityAction action)
        {
            GameObject g=new GameObject(text); g.transform.SetParent(panel.transform,false);
            Image i=g.AddComponent<Image>(); i.color=new Color(.03f,.15f,.24f,1);
            RectTransform r=g.GetComponent<RectTransform>(); r.anchorMin=new Vector2(.5f,1); r.anchorMax=new Vector2(.5f,1);
            r.pivot=new Vector2(.5f,1); r.anchoredPosition=pos; r.sizeDelta=size;
            Button b=g.AddComponent<Button>(); b.onClick.AddListener(action);
            Text t=MakeText(text,18); t.transform.SetParent(g.transform,false); t.rectTransform.anchorMin=Vector2.zero; t.rectTransform.anchorMax=Vector2.one; t.rectTransform.offsetMin=Vector2.zero; t.rectTransform.offsetMax=Vector2.zero;
        }

        private Text MakeText(string value,int size)
        {
            GameObject g=new GameObject("Text"); Text t=g.AddComponent<Text>();
            t.font=Resources.GetBuiltinResource<Font>("Arial.ttf"); t.fontSize=size; t.alignment=TextAnchor.MiddleCenter; t.color=Color.white; t.text=value;
            return t;
        }
    }
}
