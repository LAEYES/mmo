using System;
using UnityEngine;

namespace RPGQGMMO
{
    public class RPGQGCombatController : MonoBehaviour
    {
        public int maxHealth = 160;
        public int health = 160;
        public int attackPower = 14;
        public float attackCooldown = 1.0f;

        public event Action<int> HealthChanged;
        public event Action<int> ExperienceGranted;
        public event Action Died;
        public event Action<int> DamageDealt;

        [Header("Respawn")]
        [SerializeField] private float respawnDelay = 5f;
        [SerializeField] private float respawnInvulnerability = 2f;
        private bool respawning;
        private bool invulnerable;
        private bool barrierActive;

        private float nextAttackTime;

        public bool IsAlive { get { return health > 0; } }

        public void Configure(int maxHp, int power)
        {
            maxHealth = Mathf.Max(1, maxHp);
            health = maxHealth;
            attackPower = Mathf.Max(1, power);
            HealthChanged?.Invoke(health);
        }

        public bool TryAttack(RPGQGCombatController target)
        {
            if (target == null || !IsAlive || !target.IsAlive || Time.time < nextAttackTime)
                return false;

            nextAttackTime = Time.time + attackCooldown;
            target.TakeDamage(attackPower, this);
            return true;
        }

        public void TakeDamage(int amount, RPGQGCombatController source)
        {
            if (!IsAlive || invulnerable) return;
            int incoming = Mathf.Max(0, amount);
            if (barrierActive) incoming = Mathf.CeilToInt(incoming * 0.35f);
            health = Mathf.Max(0, health - incoming);
            HealthChanged?.Invoke(health);

            if (health == 0)
            {
                if (source != null)
                    source.GrantExperience(25);
                Died?.Invoke();
            if (TryGetComponent<RPGQGMMOBridge>(out var bridge)) bridge.NotifyStateChanged("player:dead");
            if (!respawning) { respawning = true; StartCoroutine(RespawnRoutine()); }
            }
        }

        public void GrantExperience(int amount)
        {
            if (amount > 0)
                ExperienceGranted?.Invoke(amount);
        }

        public void ActivateBarrier(float duration)
        {
            if (!IsAlive) return;
            barrierActive = true;
            CancelInvoke(nameof(DeactivateBarrier));
            Invoke(nameof(DeactivateBarrier), Mathf.Max(0.1f, duration));
            TryGetComponent<RPGQGMMOBridge>(out var bridge);
            if (bridge != null) bridge.NotifyStateChanged("skill:barrier:active");
        }

        private void DeactivateBarrier()
        {
            barrierActive = false;
            TryGetComponent<RPGQGMMOBridge>(out var bridge);
            if (bridge != null) bridge.NotifyStateChanged("skill:barrier:end");
        }

        public void ActivateUltimate(float radius)
        {
            if (!IsAlive) return;
            RPGQGCombatController[] targets = FindObjectsOfType<RPGQGCombatController>();
            int damage = Mathf.Max(1, attackPower * 3);
            foreach (RPGQGCombatController target in targets)
            {
                if (target == this || !target.IsAlive) continue;
                if (Vector3.Distance(transform.position, target.transform.position) <= radius)
                    target.TakeDamage(damage, this);
            }
            TryGetComponent<RPGQGMMOBridge>(out var bridge);
            if (bridge != null) bridge.NotifyStateChanged("skill:ultimate:impact:" + damage);
        }

        public void Heal(int amount)
        {
            if (!IsAlive) return;
            health = Mathf.Min(maxHealth, health + Mathf.Max(0, amount));
            HealthChanged?.Invoke(health);
        }
    }
}
