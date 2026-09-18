using System;
using UnityEngine;

namespace RPGQGMMO
{
    /// <summary>
    /// Strategic layer for FreedomArena: objectives, cover, tactical stances and
    /// adaptive scoring. It complements real-time MMO combat without replacing it.
    /// </summary>
    public sealed class RPGQGStrategicArenaCombat : MonoBehaviour
    {
        public enum Stance { Assault, Defense, Mobility }

        public Stance CurrentStance { get; private set; }
        public int Score { get; private set; }
        public int ObjectivesControlled { get; private set; }
        public bool IsObjectiveActive { get; private set; }

        public float objectiveRadius = 2.5f;
        public float captureSeconds = 4f;
        public float tacticalTick = 1f;
        private float captureProgress;
        private float nextTick;
        private RPGQGMMOBridge bridge;
        private RPGQGCombatController combat;
        private RPGQGCardMMORuntime rpg;

        public event Action<string> TacticalStateChanged;

        private void Awake()
        {
            bridge = GetComponent<RPGQGMMOBridge>();
            combat = GetComponent<RPGQGCombatController>();
            rpg = GetComponent<RPGQGCardMMORuntime>();
            CurrentStance = Stance.Assault;
            IsObjectiveActive = true;
        }

        private void Update()
        {
            if (!IsObjectiveActive || combat == null || !combat.IsAlive) return;
            if (Time.time < nextTick) return;
            nextTick = Time.time + tacticalTick;

            GameObject objective = FindClosestObjective();
            if (objective == null) return;

            float distance = Vector3.Distance(transform.position, objective.transform.position);
            if (distance <= objectiveRadius)
            {
                captureProgress = Mathf.Min(captureSeconds, captureProgress + tacticalTick);
                if (captureProgress >= captureSeconds)
                {
                    ObjectivesControlled++;
                    Score += 100;
                    captureProgress = 0f;
                    IsObjectiveActive = false;
                    TacticalStateChanged?.Invoke("objective:capture:" + ObjectivesControlled);
                    if (bridge != null) bridge.NotifyStateChanged("arena:objective:captured:" + Score);
                    if (rpg != null) rpg.AddMMOXp(35);
                    Invoke(nameof(ReactivateObjective), 8f);
                }
            }
            else
            {
                captureProgress = Mathf.Max(0f, captureProgress - tacticalTick * 0.5f);
            }
        }

        public void SetStance(string stance)
        {
            if (string.IsNullOrEmpty(stance)) return;
            if (stance.Equals("defense", StringComparison.OrdinalIgnoreCase))
                CurrentStance = Stance.Defense;
            else if (stance.Equals("mobility", StringComparison.OrdinalIgnoreCase))
                CurrentStance = Stance.Mobility;
            else
                CurrentStance = Stance.Assault;

            TacticalStateChanged?.Invoke("stance:" + CurrentStance);
            if (bridge != null) bridge.NotifyStateChanged("arena:stance:" + CurrentStance);
        }

        public void UseTacticalAction()
        {
            if (combat == null || !combat.IsAlive) return;
            if (CurrentStance == Stance.Defense)
                combat.ActivateBarrier(3f);
            else if (CurrentStance == Stance.Mobility)
                SendMessage("UseDash", SendMessageOptions.DontRequireReceiver);
            else
                SendMessage("UseUltimate", SendMessageOptions.DontRequireReceiver);
        }

        public float GetCaptureProgress()
        {
            return captureSeconds <= 0f ? 1f : Mathf.Clamp01(captureProgress / captureSeconds);
        }

        private GameObject FindClosestObjective()
        {
            GameObject[] all = GameObject.FindObjectsOfType<GameObject>();
            System.Collections.Generic.List<GameObject> objectives = new System.Collections.Generic.List<GameObject>();
            foreach (GameObject candidate in all)
                if (candidate.name.StartsWith("Stellacristal_Objective")) objectives.Add(candidate);
            GameObject closest = null;
            float best = float.MaxValue;
            foreach (GameObject objective in objectives)
            {
                float d = Vector3.Distance(transform.position, objective.transform.position);
                if (d < best) { best = d; closest = objective; }
            }
            return closest;
        }

        private void ReactivateObjective()
        {
            IsObjectiveActive = true;
            TacticalStateChanged?.Invoke("objective:active");
            if (bridge != null) bridge.NotifyStateChanged("arena:objective:active");
        }
    }
}
