export type Faction = 'Aegis' | 'Nomads' | 'Eclipse';

export type CardRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export type Card = {
  id: string;
  name: string;
  rarity: CardRarity;
  power: number;
  defense: number;
  vitality: number;
  xp: number;
  level: number;
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

function cardStats(wins: number, rarity: CardRarity): Omit<Card, 'id' | 'name'> {
  const multiplier = rarity === 'Legendary' ? 4 : rarity === 'Epic' ? 3 : rarity === 'Rare' ? 2 : 1;
  return { rarity, power: 12 + wins * 2 * multiplier, defense: 6 + wins * multiplier, vitality: 30 + wins * 4 * multiplier, xp: 0, level: 1 };
}

export function grantVictory(state: PlayerState): PlayerState {
  const victories = state.victories + 1;
  const xp = state.xp + 25;
  const level = 1 + Math.floor(xp / 100);
  const rarity: CardRarity = victories % 10 === 0 ? 'Epic' : victories % 5 === 0 ? 'Rare' : 'Common';
  const card: Card = { id: `victory-${victories}`, name: `Arena Card #${victories}`, ...cardStats(victories, rarity) };
  return { ...state, victories, xp, level, cards: [...state.cards, card] };
}

export function grantArenaReward(state: PlayerState): PlayerState {
  const arenaWins = state.arenaWins + 1;
  const xpGain = 40 + arenaWins * 5;
  const xp = state.xp + xpGain;
  const level = 1 + Math.floor(xp / 100);
  const rarity: CardRarity = arenaWins % 10 === 0 ? 'Epic' : arenaWins % 3 === 0 ? 'Rare' : 'Common';
  const card: Card = { id: `arena-${arenaWins}`, name: `Arena Reward #${arenaWins}`, ...cardStats(arenaWins, rarity) };
  return { ...state, arenaWins, victories: state.victories + 1, xp, level, cards: [...state.cards, card] };
}

export function upgradeCard(card: Card, xpGain: number): Card {
  const xp = Math.max(0, card.xp + Math.floor(xpGain));
  const level = 1 + Math.floor(xp / 100);
  return {
    ...card,
    xp,
    level,
    power: card.power + Math.floor(xpGain / 25),
    defense: card.defense + Math.floor(xpGain / 40),
    vitality: card.vitality + Math.floor(xpGain / 20),
  };
}

const STORAGE_KEY = 'freedomarena:rpgqg:player:v1';

export function loadPlayer(): PlayerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createStarterPlayer();
    return normalizePlayer(JSON.parse(raw) as Partial<PlayerState>);
  } catch {
    return createStarterPlayer();
  }
}

function normalizeCard(input: unknown): Card | null {
  if (!input || typeof input !== 'object') return null;
  const card = input as Partial<Card>;
  if (typeof card.id !== 'string' || typeof card.name !== 'string') return null;
  const rarity: CardRarity = ['Common', 'Rare', 'Epic', 'Legendary'].includes(card.rarity as string) ? card.rarity as CardRarity : 'Common';
  return {
    id: card.id, name: card.name, rarity,
    power: typeof card.power === 'number' && Number.isFinite(card.power) ? Math.max(0, Math.floor(card.power)) : 0,
    defense: typeof card.defense === 'number' && Number.isFinite(card.defense) ? Math.max(0, Math.floor(card.defense)) : 0,
    vitality: typeof card.vitality === 'number' && Number.isFinite(card.vitality) ? Math.max(1, Math.floor(card.vitality)) : 1,
    xp: typeof card.xp === 'number' && Number.isFinite(card.xp) ? Math.max(0, Math.floor(card.xp)) : 0,
    level: typeof card.level === 'number' && Number.isFinite(card.level) ? Math.max(1, Math.floor(card.level)) : 1,
  };
}

export function normalizePlayer(input: Partial<PlayerState>): PlayerState {
  const starter = createStarterPlayer();
  return {
    ...starter, ...input,
    name: typeof input.name === 'string' && input.name.trim() ? input.name.trim().slice(0, 24) : starter.name,
    level: typeof input.level === 'number' && Number.isFinite(input.level) ? Math.max(1, Math.floor(input.level)) : starter.level,
    xp: typeof input.xp === 'number' && Number.isFinite(input.xp) ? Math.max(0, Math.floor(input.xp)) : starter.xp,
    faction: factions.includes(input.faction as Faction) ? input.faction as Faction : starter.faction,
    victories: typeof input.victories === 'number' && Number.isFinite(input.victories) ? Math.max(0, Math.floor(input.victories)) : starter.victories,
    cards: Array.isArray(input.cards) ? input.cards.map(normalizeCard).filter((card): card is Card => card !== null) : [],
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
