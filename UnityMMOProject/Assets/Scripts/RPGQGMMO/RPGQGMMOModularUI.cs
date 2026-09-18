using System.Text;
using UnityEngine;
using UnityEngine.UI;

namespace RPGQGMMO
{
    /// <summary>
    /// Modular FreedomArena MMO interface: inventory, quest log, character sheet and minimap.
    /// The visuals are generated with UGUI placeholders so Canva art can replace them later.
    /// </summary>
    public sealed class RPGQGMMOModularUI : MonoBehaviour
    {
        private RPGQGMMOBridge bridge;
        private RPGQGLootInventory inventory;
        private RPGQGCombatController combat;
        private GameObject panel;
        private Text body;

        private void Awake()
        {
            bridge = GetComponent<RPGQGMMOBridge>();
            inventory = GetComponent<RPGQGLootInventory>();
            combat = GetComponent<RPGQGCombatController>();
            Build();
        }

        private void Build()
        {
            GameObject canvas = new GameObject("FreedomArena_ModularUI");
            canvas.transform.SetParent(transform, false);
            Canvas c = canvas.AddComponent<Canvas>();
            c.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.AddComponent<CanvasScaler>();
            canvas.AddComponent<GraphicRaycaster>();

            panel = new GameObject("Window");
            panel.transform.SetParent(canvas.transform, false);
            RectTransform r = panel.AddComponent<RectTransform>();
            r.anchorMin = new Vector2(.5f,.5f);
            r.anchorMax = new Vector2(.5f,.5f);
            r.sizeDelta = new Vector2(720, 520);
            panel.SetActive(false);
            Image bg = panel.AddComponent<Image>();
            bg.color = new Color(.015f,.035f,.06f,.96f);

            Text title = MakeText(panel.transform,"FREEDOMARENA",28,TextAnchor.UpperCenter);
            title.rectTransform.anchorMin=new Vector2(0,1); title.rectTransform.anchorMax=new Vector2(1,1);
            title.rectTransform.pivot=new Vector2(.5f,1); title.rectTransform.anchoredPosition=new Vector2(0,-18);
            title.rectTransform.sizeDelta=new Vector2(-40,50);

            body=MakeText(panel.transform,"",18,TextAnchor.UpperLeft);
            body.rectTransform.anchorMin=new Vector2(0,1); body.rectTransform.anchorMax=new Vector2(1,1);
            body.rectTransform.pivot=new Vector2(.5f,1); body.rectTransform.anchoredPosition=new Vector2(35,-85);
            body.rectTransform.sizeDelta=new Vector2(-70,360);

            MakeButton(panel.transform,"FERMER",new Vector2(0,-230),Close);
            MakeButton(panel.transform,"I  INVENTAIRE",new Vector2(-220,-285),ShowInventory);
            MakeButton(panel.transform,"Q  QUÊTES",new Vector2(0,-285),ShowQuests);
            MakeButton(panel.transform,"C  PERSONNAGE",new Vector2(220,-285),ShowCharacter);
        }

        private Text MakeText(Transform p,string value,int size,TextAnchor a)
        {
            GameObject g=new GameObject("Text");
            g.transform.SetParent(p,false);
            Text t=g.AddComponent<Text>();
            t.font=Resources.GetBuiltinResource<Font>("Arial.ttf");
            t.fontSize=size; t.alignment=a; t.color=Color.white; t.text=value;
            return t;
        }

        private void MakeButton(Transform p,string label,Vector2 pos,UnityEngine.Events.UnityAction action)
        {
            GameObject g=new GameObject(label);
            g.transform.SetParent(p,false);
            RectTransform r=g.AddComponent<RectTransform>();
            r.anchorMin=new Vector2(.5f,1); r.anchorMax=new Vector2(.5f,1);
            r.pivot=new Vector2(.5f,1); r.anchoredPosition=pos; r.sizeDelta=new Vector2(190,42);
            Image i=g.AddComponent<Image>(); i.color=new Color(.03f,.12f,.19f,1);
            Button b=g.AddComponent<Button>(); b.onClick.AddListener(action);
            Text t=MakeText(g.transform,label,16,TextAnchor.MiddleCenter);
            t.rectTransform.anchorMin=Vector2.zero; t.rectTransform.anchorMax=Vector2.one;
            t.rectTransform.offsetMin=Vector2.zero; t.rectTransform.offsetMax=Vector2.zero;
        }

        private void Update()
        {
            if (Input.GetKeyDown(KeyCode.I)) ShowInventory();
            if (Input.GetKeyDown(KeyCode.Q)) ShowQuests();
            if (Input.GetKeyDown(KeyCode.C)) ShowCharacter();
            if (Input.GetKeyDown(KeyCode.Escape)) Close();
        }

        private void ShowInventory()
        {
            panel.SetActive(true);
            StringBuilder s=new StringBuilder("INVENTAIRE\n\n");
            if(inventory==null || inventory.Items.Count==0) s.Append("Inventaire vide.");
            else foreach(RPGQGItemStack item in inventory.Items) s.Append("• ").Append(item.id).Append("  x").Append(item.amount).Append("\n");
            body.text=s.ToString();
        }

        private void ShowQuests()
        {
            panel.SetActive(true);
            body.text="JOURNAL DE QUÊTES\n\nRéactivation du Stellacristal\n\n• Prisme d’Astéroïde\n• Vaincre le Spectre du Vide\n• Fabriquer la Balise Stellaris\n• Activer le Relais Stellacristal";
        }

        private void ShowCharacter()
        {
            panel.SetActive(true);
            RPGQGCardProfile card=bridge!=null?bridge.GetCardProfile():RPGQGCardProfile.FromCardId("starter-gardien");
            body.text="FICHE PERSONNAGE\n\n"+card.displayName+"\nClasse : "+card.archetype+"\nPV max : "+card.maxHealth+"\nAttaque : "+card.attackPower+
                "\nPV actuels : "+(combat!=null?combat.health:0)+"\nXP : "+PlayerPrefs.GetInt("RPGQG_XP",0);
        }

        private void Close()
        {
            if(panel!=null) panel.SetActive(false);
        }
    }
}
