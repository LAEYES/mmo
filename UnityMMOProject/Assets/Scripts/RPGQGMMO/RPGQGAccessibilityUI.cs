using UnityEngine;
using UnityEngine.UI;

namespace RPGQGMMO
{
    /// <summary>Accessible mobile settings window for FreedomArena.</summary>
    public sealed class RPGQGAccessibilityUI : MonoBehaviour
    {
        private Canvas canvas;
        private GameObject window;

        private void Awake()
        {
            Build();
        }

        private void Build()
        {
            GameObject root = new GameObject("FreedomArena_Accessibility");
            root.transform.SetParent(transform, false);
            canvas = root.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            root.AddComponent<CanvasScaler>();
            root.AddComponent<GraphicRaycaster>();

            window = new GameObject("AccessibilityWindow");
            window.transform.SetParent(canvas.transform, false);
            RectTransform wr = window.AddComponent<RectTransform>();
            wr.anchorMin = new Vector2(.5f,.5f);
            wr.anchorMax = new Vector2(.5f,.5f);
            wr.sizeDelta = new Vector2(680,600);
            Image bg = window.AddComponent<Image>();
            bg.color = new Color(.015f,.03f,.055f,.98f);

            Text title = Text("ACCESSIBILITÉ",32);
            title.transform.SetParent(window.transform,false);
            Place(title.rectTransform,new Vector2(0,-30),new Vector2(620,55));

            Add("TEXTE +",new Vector2(-170,-120),()=>ChangeText(.1f));
            Add("TEXTE −",new Vector2(170,-120),()=>ChangeText(-.1f));
            Add("UI +",new Vector2(-170,-190),()=>ChangeUI(.1f));
            Add("UI −",new Vector2(170,-190),()=>ChangeUI(-.1f));
            Add("CONTRASTE",new Vector2(-170,-260),()=>Toggle(a=>a.SetHighContrast(!a.highContrast)));
            Add("MOUVEMENT RÉDUIT",new Vector2(170,-260),()=>Toggle(a=>a.SetReducedMotion(!a.reducedMotion)));
            Add("MODE GAUCHER",new Vector2(-170,-330),()=>Toggle(a=>a.SetLeftHanded(!a.leftHanded)));
            Add("AIDE COULEUR",new Vector2(170,-330),()=>Toggle(a=>a.SetColorAssist(!a.colorAssist)));
            Add("VIBRATION",new Vector2(-170,-400),()=>Toggle(a=>a.SetVibration(!a.vibrationFeedback)));
            Add("AUDIO",new Vector2(170,-400),()=>Toggle(a=>a.SetAudioFeedback(!a.audioFeedback)));
            Add("FERMER",new Vector2(0,-500),Close);
            window.SetActive(false);
        }

        private Text Text(string value,int size)
        {
            GameObject g=new GameObject("Text");
            Text t=g.AddComponent<Text>();
            t.font=Resources.GetBuiltinResource<Font>("Arial.ttf");
            t.fontSize=size; t.alignment=TextAnchor.MiddleCenter; t.color=Color.white; t.text=value;
            return t;
        }

        private void Add(string label,Vector2 pos,UnityEngine.Events.UnityAction action)
        {
            GameObject g=new GameObject(label);
            g.transform.SetParent(window.transform,false);
            RectTransform r=g.AddComponent<RectTransform>();
            r.anchorMin=new Vector2(.5f,1); r.anchorMax=new Vector2(.5f,1);
            r.pivot=new Vector2(.5f,1); r.anchoredPosition=pos; r.sizeDelta=new Vector2(270,58);
            Image i=g.AddComponent<Image>(); i.color=new Color(.03f,.14f,.22f,1);
            Button b=g.AddComponent<Button>(); b.onClick.AddListener(action);
            Text t=Text(label,18); t.transform.SetParent(g.transform,false);
            t.rectTransform.anchorMin=Vector2.zero; t.rectTransform.anchorMax=Vector2.one;
            t.rectTransform.offsetMin=Vector2.zero; t.rectTransform.offsetMax=Vector2.zero;
        }

        private void Place(RectTransform r,Vector2 p,Vector2 size)
        {
            r.anchorMin=new Vector2(.5f,1); r.anchorMax=new Vector2(.5f,1);
            r.pivot=new Vector2(.5f,1); r.anchoredPosition=p; r.sizeDelta=size;
        }

        private RPGQGInclusiveAccessibility A(){return RPGQGInclusiveAccessibility.Instance;}

        private void ChangeText(float d){if(A()!=null)A().SetTextScale(A().textScale+d);}
        private void ChangeUI(float d){if(A()!=null)A().SetUIScale(A().uiScale+d);}
        private void Toggle(System.Action<RPGQGInclusiveAccessibility> f){if(A()!=null)f(A());}
        public void Open(){window.SetActive(true);}
        public void Close(){window.SetActive(false);}
    }
}
