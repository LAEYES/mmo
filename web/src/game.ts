export type Faction = 'Aegis' | 'Nomads' | 'Eclipse';

export type Card = {
  id: string;
  name: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  power: number;
};

export type PlayerState = {
  name: string;
  level: number;
  xp: number;
  faction: Faction;
  victories: number;
  cards: Card[];
  zoneId: string;
  explorationCount: number;
  lastDiscovery: string;
  arenaWins: number;
};

export const factions: Faction[] = ['Aegis', 'Nomads', 'Eclipse'];

export function createStarterPlayer(name = 'Arena Player'): PlayerState {
  return { name, level: 1, xp: 0, faction: 'Aegis', victories: 0, cards: [], zoneId: 'outpost', explorationCount: 0, lastDiscovery: '', arenaWins: 0 };
}

export function grantVictory(state: PlayerState): PlayerState {
  const victories = state.victories + 1;
  const xp = state.xp + 25;
  const level = 1 + Math.floor(xp / 100);
  const card: Card = { id: `victory-${victories}`, name: `Arena Card #${victories}`, rarity: victories % 5 === 0 ? 'Rare' : 'Common', power: 10 + victories };
  return { ...state, victories, xp, level, cards: [...state.cards, card] };
}

export function grantArenaReward(state: PlayerState): PlayerState {
  const arenaWins = state.arenaWins + 1;
  const xpGain = 40 + arenaWins * 5;
  const xp = state.xp + xpGain;
  const level = 1 + Math.floor(xp / 100);
  const rarity = arenaWins % 10 === 0 ? 'Epic' : arenaWins % 3 === 0 ? 'Rare' : 'Common';
  const card: Card = { id: `arena-${arenaWins}`, name: `Arena Reward #${arenaWins}`, rarity, power: 15 + arenaWins * 2 };
  return { ...state, arenaWins, victories: state.victories + 1, xp, level, cards: [...state.cards, card] };
}

const STORAGE_KEY = 'freedomarena:rpgqg:player:v1';

export function loadPlayer(): PlayerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createStarterPlayer();
    const parsed = JSON.parse(raw) as Partial<PlayerState>;
    return normalizePlayer(parsed);
  } catch {
    return createStarterPlayer();
  }
}

export function normalizePlayer(input: Partial<PlayerState>): PlayerState {
  const starter = createStarterPlayer();
  return {
    ...starter,
    ...input,
    name: typeof input.name === 'string' && input.name.trim() ? input.name.trim().slice(0, 24) : starter.name,
    level: typeof input.level === 'number' && Number.isFinite(input.level) ? Math.max(1, Math.floor(input.level)) : starter.level,
    xp: typeof input.xp === 'number' && Number.isFinite(input.xp) ? Math.max(0, Math.floor(input.xp)) : starter.xp,
    faction: factions.includes(input.faction as Faction) ? input.faction as Faction : starter.faction,
    victories: typeof input.victories === 'number' && Number.isFinite(input.victories) ? Math.max(0, Math.floor(input.victories)) : starter.victories,
    cards: Array.isArray(input.cards) ? input.cards.filter((card): card is Card => Boolean(card && typeof card.id === 'string' && typeof card.name === 'string' && typeof card.power === 'number')) : [],
    zoneId: typeof input.zoneId === 'string' ? input.zoneId : starter.zoneId,
    explorationCount: typeof input.explorationCount === 'number' && Number.isFinite(input.explorationCount) ? Math.max(0, Math.floor(input.explorationCount)) : starter.explorationCount,
    lastDiscovery: typeof input.lastDiscovery === 'string' ? input.lastDiscovery.slice(0, 200) : starter.lastDiscovery,
    arenaWins: typeof input.arenaWins === 'number' && Number.isFinite(input.arenaWins) ? Math.max(0, Math.floor(input.arenaWins)) : starter.arenaWins,
  };
}

export function savePlayer(state: PlayerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizePlayer(state)));
}

export function clearPlayerSave(): void {
  localStorage.removeItem(STORAGE_KEY);
}
