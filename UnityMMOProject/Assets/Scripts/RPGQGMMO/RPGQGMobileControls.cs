using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace RPGQGMMO
{
    /// <summary>Touch-first Android controls: virtual joystick, attack and menu buttons.</summary>
    public sealed class RPGQGMobileControls : MonoBehaviour
    {
        public RPGQGPlayerController player;
        public RPGQGCombatController combat;
        public float joystickRadius = 85f;

        private MobileJoystick joystick;

        private void Awake()
        {
            if (player == null) player = GetComponent<RPGQGPlayerController>();
            if (combat == null) combat = GetComponent<RPGQGCombatController>();
            Build();
        }

        private void Start()
        {
            if (player != null) player.mobileJoystick = joystick;
        }

        private void Build()
        {
            GameObject cgo = new GameObject("FreedomArena_MobileControls");
            cgo.transform.SetParent(transform, false);
            Canvas c = cgo.AddComponent<Canvas>();
            c.renderMode = RenderMode.ScreenSpaceOverlay;
            cgo.AddComponent<CanvasScaler>();
            cgo.AddComponent<GraphicRaycaster>();
            if (FindObjectOfType<EventSystem>() == null)
            {
                GameObject e = new GameObject("EventSystem");
                e.AddComponent<EventSystem>();
                e.AddComponent<StandaloneInputModule>();
            }

            bool left = RPGQGInclusiveAccessibility.Instance != null && RPGQGInclusiveAccessibility.Instance.leftHanded;
            joystick = CreateJoystick(c.transform, left);
            Vector2 attackPos = left ? new Vector2(110, 120) : new Vector2(-110, 120);
            CreateButton(c.transform, "ATTACK", attackPos, new Vector2(170,170), Attack);
            CreateButton(c.transform, "MENU", new Vector2(-95, -55), new Vector2(150,70), Menu);
            CreateButton(c.transform, "I", new Vector2(-285, -45), new Vector2(75,75), Inventory);
            CreateButton(c.transform, "Q", new Vector2(-375, -45), new Vector2(75,75), Quests);
            CreateButton(c.transform, "C", new Vector2(-465, -45), new Vector2(75,75), Character);
        }

        private MobileJoystick CreateJoystick(Transform parent, bool leftHanded)
        {
            GameObject baseGo = new GameObject("VirtualJoystick");
            baseGo.transform.SetParent(parent, false);
            RectTransform r = baseGo.AddComponent<RectTransform>();
            r.anchorMin = new Vector2(0,0); r.anchorMax = new Vector2(0,0);
            r.pivot = new Vector2(.5f,.5f); r.anchoredPosition = leftHanded ? new Vector2(150,170) : new Vector2(150,170);
            r.sizeDelta = new Vector2(220,220);
            Image bg = baseGo.AddComponent<Image>(); bg.color = new Color(.02f,.12f,.18f,.72f);

            GameObject handle = new GameObject("Handle");
            handle.transform.SetParent(baseGo.transform,false);
            RectTransform hr=handle.AddComponent<RectTransform>();
            hr.sizeDelta=new Vector2(105,105);
            Image hi=handle.AddComponent<Image>(); hi.color=new Color(.1f,.72f,1f,.82f);

            MobileJoystick j=baseGo.AddComponent<MobileJoystick>();
            j.handle=hr; j.radius=joystickRadius;
            return j;
        }

        private void CreateButton(Transform parent,string label,Vector2 pos,Vector2 size,UnityEngine.Events.UnityAction action)
        {
            GameObject g=new GameObject(label);
            g.transform.SetParent(parent,false);
            RectTransform r=g.AddComponent<RectTransform>();
            r.anchorMin=new Vector2(1,0); r.anchorMax=new Vector2(1,0);
            r.pivot=new Vector2(1,0); r.anchoredPosition=pos; r.sizeDelta=size;
            Image i=g.AddComponent<Image>(); i.color=new Color(.02f,.12f,.19f,.82f);
            Button b=g.AddComponent<Button>(); b.onClick.AddListener(action);
            GameObject tgo=new GameObject("Label"); tgo.transform.SetParent(g.transform,false);
            RectTransform tr=tgo.AddComponent<RectTransform>(); tr.anchorMin=Vector2.zero; tr.anchorMax=Vector2.one; tr.offsetMin=Vector2.zero; tr.offsetMax=Vector2.zero;
            Text t=tgo.AddComponent<Text>(); t.font=Resources.GetBuiltinResource<Font>("Arial.ttf"); t.text=label; t.fontSize=label=="ATTACK"?28:22; t.alignment=TextAnchor.MiddleCenter; t.color=Color.white;
        }

        private void Attack()
        {
            if (combat == null) return;
            RPGQGCombatController nearest=null;
            float best=3f;
            foreach(RPGQGCombatController candidate in FindObjectsOfType<RPGQGCombatController>())
            {
                if(candidate==combat || !candidate.IsAlive) continue;
                float d=Vector3.Distance(transform.position,candidate.transform.position);
                if(d<best){best=d;nearest=candidate;}
            }
            if(nearest!=null) combat.TryAttack(nearest);
        }

        private void Menu(){ SendMessage("OpenMenu",SendMessageOptions.DontRequireReceiver); }
        private void Inventory(){ SendMessage("ShowInventory",SendMessageOptions.DontRequireReceiver); }
        private void Quests(){ SendMessage("ShowQuests",SendMessageOptions.DontRequireReceiver); }
        private void Character(){ SendMessage("ShowCharacter",SendMessageOptions.DontRequireReceiver); }
    }

    public sealed class MobileJoystick : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler
    {
        public RectTransform handle;
        public float radius=85f;
        public Vector2 Value {get;private set;}

        public void OnPointerDown(PointerEventData e){ OnDrag(e); }
        public void OnDrag(PointerEventData e)
        {
            Vector2 local;
            RectTransformUtility.ScreenPointToLocalPointInRectangle((RectTransform)transform,e.position,e.pressEventCamera,out local);
            Value=Vector2.ClampMagnitude(local/radius,1f);
            if(handle!=null) handle.anchoredPosition=Value*radius;
        }
        public void OnPointerUp(PointerEventData e){ Value=Vector2.zero; if(handle!=null) handle.anchoredPosition=Vector2.zero; }
    }
}
