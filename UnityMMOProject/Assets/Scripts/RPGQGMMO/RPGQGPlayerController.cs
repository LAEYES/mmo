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

        public Vector3 WorldPosition { get { return transform.position; } }

        private void Awake()
        {
            controller = GetComponent<CharacterController>();
            if (cameraTransform == null && Camera.main != null)
                cameraTransform = Camera.main.transform;
        }

        private void Update()
        {
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

        public void Teleport(Vector3 position)
        {
            controller.enabled = false;
            transform.position = position;
            controller.enabled = true;
        }
    }
}
