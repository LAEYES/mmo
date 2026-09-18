using UnityEngine;

namespace RPGQGMMO
{
    /// <summary>
    /// Third-person MMO controller for FreedomArena, with Android touch support.
    /// Uses Unity's legacy input API so the project does not require the Input System package.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class RPGQGPlayerController : MonoBehaviour
    {
        public float moveSpeed = 5f;
        public float rotationSpeed = 12f;
        public float gravity = -20f;
        public Transform cameraTransform;
        [HideInInspector] public MobileJoystick mobileJoystick;

        private CharacterController controller;
        private Vector3 verticalVelocity;
        private RPGQGCardMMORuntime rpg;
        private float dashTime;
        private float barrierTime;
        private float ultimateTime;
        private float baseMoveSpeed = 5f;

        public Vector3 WorldPosition { get { return transform.position; } }

        private void Awake()
        {
            controller = GetComponent<CharacterController>();
            rpg = GetComponent<RPGQGCardMMORuntime>();
            baseMoveSpeed = moveSpeed;
            if (cameraTransform == null && Camera.main != null)
                cameraTransform = Camera.main.transform;
        }

        private void ApplyHeroSpeed()
        {
            RPGQGMMOBridge bridge = GetComponent<RPGQGMMOBridge>();
            if (bridge == null) return;
            RPGQGCardProfile profile = bridge.GetCardProfile();
            moveSpeed = profile.moveSpeed > 0f ? profile.moveSpeed : baseMoveSpeed;
        }

        private void Update()
        {
            ApplyHeroSpeed();
            dashTime = Mathf.Max(0f, dashTime - Time.deltaTime);
            barrierTime = Mathf.Max(0f, barrierTime - Time.deltaTime);
            ultimateTime = Mathf.Max(0f, ultimateTime - Time.deltaTime);
            HandleSkills();
            Vector2 input = mobileJoystick != null ? mobileJoystick.Value : new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
            Vector3 forward = cameraTransform != null ? cameraTransform.forward : Vector3.forward;
            Vector3 right = cameraTransform != null ? cameraTransform.right : Vector3.right;
            forward.y = 0f;
            right.y = 0f;
            forward.Normalize();
            right.Normalize();

            Vector3 move = (forward * input.y + right * input.x);
            if (move.sqrMagnitude > 1f) move.Normalize();

            controller.Move(move * moveSpeed * Time.deltaTime);

            if (move.sqrMagnitude > 0.001f)
            {
                Quaternion target = Quaternion.LookRotation(move, Vector3.up);
                transform.rotation = Quaternion.Slerp(transform.rotation, target, rotationSpeed * Time.deltaTime);
            }

            if (controller.isGrounded && verticalVelocity.y < 0f)
                verticalVelocity.y = -2f;
            verticalVelocity.y += gravity * Time.deltaTime;
            controller.Move(verticalVelocity * Time.deltaTime);
        }

        private void HandleSkills()
        {
            if (rpg == null) return;
            bool dash = Input.GetKeyDown(KeyCode.LeftShift) || Input.GetKeyDown(KeyCode.Space);
            bool barrier = Input.GetKeyDown(KeyCode.B);
            bool ultimate = Input.GetKeyDown(KeyCode.U);
            if (mobileJoystick != null)
            {
                dash |= Input.GetKeyDown(KeyCode.J);
                barrier |= Input.GetKeyDown(KeyCode.K);
                ultimate |= Input.GetKeyDown(KeyCode.L);
            }
            if (dash && dashTime <= 0f && rpg.TryUseSkill("dash"))
            {
                Vector3 dir = transform.forward;
                controller.Move(dir * 4f);
                dashTime = 0.2f;
            }
            if (barrier && barrierTime <= 0f && rpg.TryUseSkill("barrier"))
                SendMessage("ActivateBarrier", 3f, SendMessageOptions.DontRequireReceiver);
            if (ultimate && ultimateTime <= 0f && rpg.TryUseSkill("ultimate"))
                SendMessage("ActivateUltimate", 8f, SendMessageOptions.DontRequireReceiver);
        }

        public void UseDash()
        {
            if (rpg != null && dashTime <= 0f && rpg.TryUseSkill("dash"))
            {
                controller.Move(transform.forward * 4f);
                dashTime = 0.2f;
            }
        }

        public void UseBarrier()
        {
            if (rpg != null && barrierTime <= 0f && rpg.TryUseSkill("barrier"))
            {
                barrierTime = 12f;
                SendMessage("ActivateBarrier", 3f, SendMessageOptions.DontRequireReceiver);
            }
        }

        public void UseUltimate()
        {
            if (rpg != null && ultimateTime <= 0f && rpg.TryUseSkill("ultimate"))
            {
                ultimateTime = 30f;
                SendMessage("ActivateUltimate", 8f, SendMessageOptions.DontRequireReceiver);
            }
        }

        public void Teleport(Vector3 position)
        {
            controller.enabled = false;
            transform.position = position;
            controller.enabled = true;
        }
    }
}
