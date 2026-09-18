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
            if (!IsAlive) return;
            health = Mathf.Max(0, health - Mathf.Max(0, amount));
            HealthChanged?.Invoke(health);

            if (health == 0)
            {
                if (source != null)
                    source.ExperienceGranted?.Invoke(25);
                Died?.Invoke();
            }
        }

        public void Heal(int amount)
        {
            if (!IsAlive) return;
            health = Mathf.Min(maxHealth, health + Mathf.Max(0, amount));
            HealthChanged?.Invoke(health);
        }
    }
}
