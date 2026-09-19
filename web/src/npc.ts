export type NpcAffinity = 'ally' | 'neutral' | 'rival';

export type NpcMemory = {
  npcId: string;
  affinity: NpcAffinity;
  trust: number;
  encounters: number;
};

export type NpcAction = 'dialogue' | 'trade' | 'patrol';

export type NpcResolution = {
  memory: NpcMemory;
  xp: number;
  resources: number;
  threatDelta: number;
  message: string;
};

export function createNpcMemory(npcId: string): NpcMemory {
  return { npcId, affinity: 'neutral', trust: 0, encounters: 0 };
}

export function resolveNpcAction(memory: NpcMemory, action: NpcAction, worldThreat: number, worldResources: number): NpcResolution {
  const encounters = memory.encounters + 1;
  const delta = action === 'dialogue' ? 2 : action === 'trade' ? 1 : 3;
  const trust = Math.max(-10, Math.min(20, memory.trust + delta));
  const affinity: NpcAffinity = trust >= 8 ? 'ally' : trust <= -3 ? 'rival' : 'neutral';
  const xp = action === 'patrol' ? 15 : action === 'trade' ? 12 : 8;
  const resources = action === 'trade' && worldResources >= 1 ? 1 : action === 'dialogue' ? 1 : 0;
  const threatDelta = action === 'patrol' ? -1 : action === 'dialogue' && worldThreat >= 5 ? 1 : 0;
  return {
    memory: { ...memory, encounters, trust, affinity },
    xp,
    resources,
    threatDelta,
    message: affinity === 'ally'
      ? 'The faction contact now trusts you.'
      : action === 'trade'
        ? 'The contact exchanges frontier supplies.'
        : action === 'patrol'
          ? 'The patrol route is stabilized.'
          : 'The contact shares local intelligence.'
  };
}

export function serializeNpcMemory(memories: NpcMemory[]): string {
  return JSON.stringify(memories.slice(-100));
}

export function deserializeNpcMemory(raw: string | null): NpcMemory[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is NpcMemory =>
      Boolean(item) && typeof item === 'object' &&
      typeof (item as NpcMemory).npcId === 'string' &&
      typeof (item as NpcMemory).trust === 'number' &&
      typeof (item as NpcMemory).encounters === 'number'
    );
  } catch {
    return [];
  }
}
