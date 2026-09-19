import { describe, expect, it } from 'vitest';
import { createEncounter, getCombatPerformance, getCombatReward, playerAttack } from './combat';

describe('combat system', () => {
  it('creates a deterministic encounter from level and faction inputs', () => {
    const encounter = createEncounter(2, 2, { faction: 'Nomads', threat: 4 });
    expect(encounter.player.level).toBe(2);
    expect(encounter.enemy.name).toBe('Nomad Raider');
    expect(encounter.enemy.level).toBe(3);
    expect(encounter.status).toBe('active');
  });

  it('resolves a player attack and alternates turns', () => {
    const encounter = createEncounter(10, 1, { faction: 'Aegis' });
    const next = playerAttack(encounter);
    expect(next.player.hp).toBeLessThan(encounter.player.hp);
    expect(next.enemy.hp).toBeLessThan(encounter.enemy.hp);
    expect(next.status).toBe('active');
    expect(next.turn).toBe('player');
  });

  it('rewards victories and performance', () => {
    let encounter = createEncounter(20, 1, { faction: 'Aegis' });
    let guard = 0;
    while (encounter.status === 'active' && guard++ < 20) encounter = playerAttack(encounter);
    expect(encounter.status).toBe('victory');
    expect(getCombatReward(encounter)).toBeGreaterThan(0);
    expect(getCombatPerformance(encounter)).toBeGreaterThanOrEqual(getCombatReward(encounter) - 10);
  });
});
