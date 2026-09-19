import { describe, expect, it } from 'vitest';
import { createEncounter, getCombatPerformance, getCombatReward, playerAttack } from './combat';

describe('combat system', () => {
  it('creates deterministic encounters from level, threat and faction inputs', () => {
    const encounter = createEncounter(2, 2, { faction: 'Nomads', threat: 4 });
    expect(encounter.player.level).toBe(2);
    expect(encounter.enemy.name).toBe('Nomad Raider');
    expect(encounter.enemy.level).toBe(3);
    expect(encounter.enemy.hp).toBe(encounter.enemy.maxHp);
    expect(encounter.status).toBe('active');
  });

  it('resolves a non-lethal attack and returns control to the player', () => {
    const encounter = createEncounter(10, 1, { faction: 'Aegis' });
    const next = playerAttack(encounter);
    expect(next.player.hp).toBeLessThan(encounter.player.hp);
    expect(next.enemy.hp).toBeLessThan(encounter.enemy.hp);
    expect(next.status).not.toBe('defeat');
    expect(next.turn).toBe('player');
  });

  it('calculates rewards and positive performance for a victory', () => {
    const encounter = createEncounter(20, 1, { faction: 'Aegis' });
    const victory = {
      ...encounter,
      status: 'victory' as const,
      enemy: { ...encounter.enemy, hp: 0 },
    };
    expect(getCombatReward(victory)).toBeGreaterThan(0);
    expect(getCombatPerformance(victory)).toBeGreaterThan(0);
  });
});
