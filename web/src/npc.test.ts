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

  it('applies trade as a net resource gain only when supplies exist', () => {
    const memory = createNpcMemory('outpost:npc:merchant');
    const funded = resolveNpcAction(memory, 'trade', 2, 3);
    const empty = resolveNpcAction(memory, 'trade', 2, 0);
    expect(funded.resources).toBe(1);
    expect(empty.resources).toBe(0);
    expect(funded.xp).toBe(12);
  });

  it('raises threat when high-threat dialogue is repeated', () => {
    const memory = createNpcMemory('eclipse:npc:observer');
    const resolution = resolveNpcAction(memory, 'dialogue', 5, 0);
    expect(resolution.threatDelta).toBe(1);
    expect(resolution.resources).toBe(1);
  });

  it('serializes and restores memories', () => {
    const memory = createNpcMemory('dustlands:npc:1');
    const restored = deserializeNpcMemory(serializeNpcMemory([memory]));
    expect(restored).toHaveLength(1);
    expect(restored[0].npcId).toBe(memory.npcId);
  });
});
