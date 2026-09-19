import { describe, expect, it } from 'vitest';
import { createNpcMemory, resolveNpcAction, serializeNpcMemory, deserializeNpcMemory } from './npc';

describe('npc relationships', () => {
  it('builds trust through repeated dialogue', () => {
    let memory = createNpcMemory('outpost:npc:0');
    memory = resolveNpcAction(memory, 'dialogue', 2, 0).memory;
    memory = resolveNpcAction(memory, 'dialogue', 2, 0).memory;
    memory = resolveNpcAction(memory, 'dialogue', 2, 0).memory;
    memory = resolveNpcAction(memory, 'dialogue', 2, 0).memory;
    expect(memory.trust).toBe(8);
    expect(memory.affinity).toBe('ally');
  });

  it('serializes and restores memories', () => {
    const memory = createNpcMemory('dustlands:npc:1');
    const restored = deserializeNpcMemory(serializeNpcMemory([memory]));
    expect(restored).toHaveLength(1);
    expect(restored[0].npcId).toBe(memory.npcId);
  });
});
