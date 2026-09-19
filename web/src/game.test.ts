import { describe, expect, it } from 'vitest';
import { createStarterPlayer, fuseCards, getCardFusionCost, getNextRarity, isValidPlayerState, normalizePlayer, upgradeCard, type Card } from './game';
import { generateWorldEvent, getWorldEventPhase, getWorldEventPoint, getWorldEventProgress, zones } from './world';

describe('RPGQG core', () => {
  const base = createStarterPlayer('Test');
  const a: Card = { id: 'a', name: 'A', rarity: 'Common', power: 10, defense: 5, vitality: 20, xp: 50, level: 1 };
  const b: Card = { id: 'b', name: 'B', rarity: 'Common', power: 14, defense: 7, vitality: 30, xp: 100, level: 2 };

  it('validates starter state and rarity progression', () => {
    expect(isValidPlayerState(base)).toBe(true);
    expect(getNextRarity('Common')).toBe('Rare');
    expect(getNextRarity('Legendary')).toBeNull();
    expect(getCardFusionCost('Common')).toBe(2);
  });

  it('fuses funded cards and transfers equipment', () => {
    const fused = fuseCards({ ...base, cards: [a, b], fusionMaterials: 2, equippedCardId: 'a' }, 'a', 'b');
    expect(fused.cards).toHaveLength(1);
    expect(fused.cards[0].rarity).toBe('Rare');
    expect(fused.fusionMaterials).toBe(0);
    expect(fused.equippedCardId).toBe(fused.cards[0].id);
  });

  it('blocks underfunded fusion and rejects duplicate ids', () => {
    expect(fuseCards({ ...base, cards: [a, b], fusionMaterials: 1, equippedCardId: 'a' }, 'a', 'b').cards).toHaveLength(2);
    const legacy = normalizePlayer({ ...base, cards: [{ ...a, id: 'x' }, { ...a, id: 'x' }] });
    expect(isValidPlayerState(legacy)).toBe(false);
  });

  it('applies a single card upgrade', () => {
    expect(upgradeCard(a, 100)).toMatchObject({ level: 2, power: 13, defense: 7, vitality: 25 });
  });
});

describe('world events', () => {
  it('keeps event points inside map bounds', () => {
    const event = generateWorldEvent(zones[0], 4, 10, 2, 100);
    const point = getWorldEventPoint(event);
    expect(point.x).toBeGreaterThanOrEqual(4);
    expect(point.x).toBeLessThanOrEqual(55);
    expect(point.y).toBeGreaterThanOrEqual(4);
    expect(point.y).toBeLessThanOrEqual(35);
  });

  it('clamps progress and exposes lifecycle phases', () => {
    const event = generateWorldEvent(zones[0], 4, 10, 2, 100);
    expect(getWorldEventProgress(event, 0)).toBe(0);
    expect(getWorldEventProgress(event, event.duration)).toBe(100);
    expect(getWorldEventProgress(event, event.duration + 99)).toBe(100);
    const phased = { ...event, duration: 10 };
    expect(getWorldEventPhase(phased, 1)).toBe('active');
    expect(getWorldEventPhase(phased, 5)).toBe('urgent');
    expect(getWorldEventPhase(phased, 8)).toBe('expiring');
  });
});
