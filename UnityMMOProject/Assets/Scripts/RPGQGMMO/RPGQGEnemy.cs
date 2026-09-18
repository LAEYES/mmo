using UnityEngine;

namespace RPGQGMMO
{
    public class RPGQGEnemy : MonoBehaviour
    {
        public string enemyId = "Spectre du Vide";
        public int maxHealth = 80;
        public int attackPower = 8;
        public float detectionRange = 12f;
        public float attackRange = 2.2f;
        public float attackInterval = 1.5f;

        private RPGQGCombatController combat;
        private Transform target;
        private float nextAttack;

        private void Awake()
        {
            combat = GetComponent<RPGQGCombatController>();
            if (combat == null) combat = gameObject.AddComponent<RPGQGCombatController>();
            combat.Configure(maxHealth, attackPower);
            combat.Died += OnDied;
        }

        private void Update()
        {
            if (target == null)
            {
                GameObject player = GameObject.FindGameObjectWithTag("Player");
                if (player != null) target = player.transform;
                return;
            }

            float distance = Vector3.Distance(transform.position, target.position);
            if (distance > detectionRange || !combat.IsAlive) return;

            Vector3 direction = target.position - transform.position;
            direction.y = 0f;
            if (direction.sqrMagnitude > 0.01f)
                transform.rotation = Quaternion.LookRotation(direction);

            if (distance <= attackRange && Time.time >= nextAttack)
            {
                RPGQGCombatController playerCombat = target.GetComponent<RPGQGCombatController>();
                if (playerCombat != null)
                {
                    nextAttack = Time.time + attackInterval;
                    combat.TryAttack(playerCombat);
                }
            }
        }

        private void OnDied()
        {
            RPGQGMMOBridge bridge = FindObjectOfType<RPGQGMMOBridge>();
            if (bridge != null) bridge.OnEnemyDefeated(enemyId);
            Destroy(gameObject, 0.25f);
        }
    }
}
