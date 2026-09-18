using System;
using System.Collections.Generic;
using UnityEngine;

namespace RPGQGMMO
{
    [Serializable]
    public class RPGQGQuestStep
    {
        public string id;
        public string description;
        public bool completed;
    }

    /// <summary>
    /// Runtime representation of the Lua quest chain.
    /// The bridge can advance it from Unity gameplay events without duplicating the world generator.
    /// </summary>
    public class RPGQGQuestRuntime : MonoBehaviour
    {
        public string questId = "reactivation-stellacristal";
        public List<RPGQGQuestStep> steps = new List<RPGQGQuestStep>
        {
            new RPGQGQuestStep { id = "gather-prism", description = "Obtenir le Prisme d'Astéroïde" },
            new RPGQGQuestStep { id = "defeat-spectre", description = "Vaincre le Spectre du Vide" },
            new RPGQGQuestStep { id = "craft-beacon", description = "Fabriquer la Balise Stellaris" },
            new RPGQGQuestStep { id = "activate-relay", description = "Activer le Relais Stellacristal" }
        };

        public event Action<string> StepCompleted;
        public event Action QuestCompleted;

        public void CompleteStep(string stepId)
        {
            RPGQGQuestStep step = steps.Find(x => x.id == stepId);
            if (step == null || step.completed) return;
            step.completed = true;
            StepCompleted?.Invoke(stepId);

            for (int i = 0; i < steps.Count; i++)
                if (!steps[i].completed) return;

            QuestCompleted?.Invoke();
        }

        public bool IsComplete(string stepId)
        {
            RPGQGQuestStep step = steps.Find(x => x.id == stepId);
            return step != null && step.completed;
        }

        public bool CanComplete(string stepId)
        {
            int index = steps.FindIndex(x => x.id == stepId);
            if (index < 0) return false;
            for (int i = 0; i < index; i++)
                if (!steps[i].completed) return false;
            return true;
        }
    }
}
